import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from '../middleware/auth';
import { checkAndDeductCredits, refundCredits } from '../middleware/credits';
import { extractProductContext, generateSeeds, generateRefineSeeds } from '../services/gemini';
import { inferCategory, inferCategoryFromSeeds } from '../services/categoryInference';
import { expandAutocomplete, discoverCompetitors } from '../services/autocomplete';
import { enrichKeywords, forecastKeywords } from '../services/keywordPlanner';
import { overlayTrends } from '../services/googleTrends';
import { scoreAndClassify, nameClustersBatch, scoreRelevance } from '../services/gemini';
import type { SearchRequest, SearchResult, KeywordResult } from '@jackpotkeywords/shared';

const router = Router();
const db = admin.firestore();

/**
 * POST /api/search
 * Main search endpoint — orchestrates the 6-step pipeline
 */
router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  const userId = req.userId;
  const isAnonymous = !userId;
  const { description, url, budget } = req.body as SearchRequest;

  if (!description?.trim() && !url?.trim()) {
    res.status(400).json({ error: 'Description or URL required' });
    return;
  }

  // Step 0: Check and deduct credits (skip for anonymous)
  let creditResult = { allowed: true, newBalance: 0, isFreeSearch: true };
  if (!isAnonymous) {
    creditResult = await checkAndDeductCredits(userId, 1, 'keyword_search', 'keyword search');

    if (!creditResult.allowed) {
      res.status(402).json({
        error: 'Insufficient credits',
        balance: creditResult.newBalance,
      });
      return;
    }
  }

  try {
    // Step 0: Extract structured product context
    functions.logger.info('Step 0: Extracting product context...');
    const context = await extractProductContext(description, url);
    functions.logger.info(`Step 0 done: "${context.productLabel}" — ${context.keyFeatures.length} features, ${context.competitors.length} competitors, ${context.painPoints.length} pain points`);

    // Step 1: AI seed generation
    functions.logger.info('Step 1: Generating seeds...');
    const seeds = await generateSeeds(context);
    functions.logger.info(`Step 1 done: ${seeds.allSeeds.length} seeds, ${seeds.topSeeds.length} top seeds`);

    // Steps 1b + 2: Run competitor discovery and autocomplete expansion in parallel
    functions.logger.info('Steps 1b+2: Discovering competitors + expanding autocomplete (parallel)...');
    const [competitorSeeds, autocompleteKeywords] = await Promise.all([
      discoverCompetitors(seeds.productLabel, seeds.allSeeds),
      expandAutocomplete(seeds.topSeeds),
    ]);
    if (competitorSeeds.length > 0) {
      seeds.allSeeds.push(...competitorSeeds);
    }
    functions.logger.info(`Steps 1b+2 done: ${competitorSeeds.length} competitor seeds, ${autocompleteKeywords.length} autocomplete keywords`);

    // Step 3: Merge and deduplicate
    const masterList = mergeAndDeduplicate(seeds.allSeeds, autocompleteKeywords);
    functions.logger.info(`Step 3 done: ${masterList.length} unique keywords after merge`);

    // Step 4: Google Ads Keyword Planner enrichment
    functions.logger.info('Step 4: Enriching via Keyword Planner...');
    const enriched = await enrichKeywords(masterList);
    functions.logger.info(`Step 4 done: ${enriched.length} enriched keywords`);

    // Step 5: Google Trends overlay (top 100 by volume)
    functions.logger.info('Step 5: Overlaying trends...');
    const withTrends = await overlayTrends(enriched);
    functions.logger.info(`Step 5 done: ${withTrends.filter((k) => k.trendDirection).length} with trend data`);

    // Step 6: AI scoring and classification
    functions.logger.info('Step 6: Scoring and classifying...');
    const scored = await scoreAndClassify(withTrends, context, budget);
    functions.logger.info(`Step 6 done: ${scored.keywords.length} scored keywords`);

    // Build result
    // Cap at top 1000 keywords by score to stay under Firestore 1MB doc limit
    const MAX_KEYWORDS = 1000;
    if (scored.keywords.length > MAX_KEYWORDS) {
      scored.keywords.sort((a, b) => b.jackpotScore - a.jackpotScore);
      scored.keywords = scored.keywords.slice(0, MAX_KEYWORDS);
    }

    const searchId = db.collection('users').doc().id;
    const paid = !creditResult.isFreeSearch;

    const result: any = {
      id: searchId,
      query: description,
      productLabel: seeds.productLabel,
      url: url || '',
      mode: 'keyword',
      budget: budget || 0,
      createdAt: new Date().toISOString(),
      paid,
      keywords: scored.keywords,
      categories: scored.categories,
      clusters: scored.clusters,
      productContext: context,
      metadata: {
        seedCount: seeds.allSeeds.length,
        autocompleteCount: autocompleteKeywords.length,
        plannerRelatedCount: enriched.length - masterList.length,
        trendsOverlayCount: withTrends.filter((k) => k.trendDirection).length,
        totalKeywords: scored.keywords.length,
        executionTimeMs: Date.now() - startTime,
      },
    };

    functions.logger.info(`Search complete: ${result.keywords.length} keywords (not saved — user selects and saves later)`);
    res.json(result);
  } catch (error: any) {
    functions.logger.error('Search pipeline error:', error.stack || error.message);
    // Refund credit on pipeline failure (skip for anonymous)
    if (!isAnonymous) {
      await refundCredits(userId!, 1, `Search failed: ${error.message}`);
    }
    res.status(500).json({ error: 'Search pipeline failed', details: error.message });
  }
});

/**
 * POST /api/search/claim
 * Claim a search — deducts credit and returns paid status (no Firestore save)
 */
router.post('/claim', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  try {
    const creditResult = await checkAndDeductCredits(userId, 1, 'keyword_search', 'claimed search');
    if (!creditResult.allowed) {
      res.status(402).json({ error: 'Insufficient credits', balance: creditResult.newBalance });
      return;
    }
    const paid = !creditResult.isFreeSearch;
    functions.logger.info(`Search claimed by user ${userId} (paid: ${paid})`);
    res.json({ paid });
  } catch (error: any) {
    functions.logger.error('Claim error:', error.message);
    res.status(500).json({ error: 'Failed to claim search' });
  }
});

/**
 * POST /api/search/save
 * Save user-selected keywords to Firestore (max 200)
 */
router.post('/save', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { query, productLabel, url, budget, keywords, categories, clusters, marketIntelligence, metadata } = req.body;

  if (!keywords || !Array.isArray(keywords)) {
    res.status(400).json({ error: 'Keywords required' });
    return;
  }
  if (keywords.length > 200) {
    res.status(400).json({ error: 'Maximum 200 keywords per save' });
    return;
  }

  try {
    const searchId = db.collection('users').doc().id;
    const savedResult = {
      id: searchId,
      query: query || '',
      productLabel: productLabel || '',
      url: url || '',
      budget: budget || 0,
      createdAt: new Date().toISOString(),
      paid: true,
      keywords,
      categories: categories || [],
      clusters: clusters || [],
      marketIntelligence: marketIntelligence || null,
      metadata: { ...(metadata || {}), savedKeywordCount: keywords.length },
    };

    const firestoreData = JSON.parse(JSON.stringify(savedResult));
    await db.doc(`users/${userId}/searches/${searchId}`).set(firestoreData);

    functions.logger.info(`Saved search: ${searchId} for user ${userId} (${keywords.length} keywords)`);
    res.json({ id: searchId });
  } catch (error: any) {
    functions.logger.error('Save search error:', error.message);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

/**
 * POST /api/search/name-clusters
 * Name clusters via Gemini (called async from frontend after keywords load)
 */
router.post('/name-clusters', async (req, res) => {
  const { clusters } = req.body;
  if (!clusters || !Array.isArray(clusters)) {
    res.status(400).json({ error: 'Clusters required' });
    return;
  }
  try {
    const named = await nameClustersBatch(clusters);
    functions.logger.info(`Named ${named.length} clusters via async endpoint`);
    res.json({ clusters: named });
  } catch (err: any) {
    functions.logger.error('Cluster naming error:', err.message);
    res.status(500).json({ error: 'Naming failed', details: err.message });
  }
});

/**
 * POST /api/search/score-relevance
 * Score keyword relevance via Gemini (called async from frontend after keywords load)
 */
router.post('/score-relevance', async (req, res) => {
  const { keywords, context } = req.body;
  if (!keywords || !Array.isArray(keywords) || !context) {
    res.status(400).json({ error: 'Keywords and context required' });
    return;
  }
  try {
    // Split into 2 parallel batches of 100
    const batch1 = keywords.slice(0, 100);
    const batch2 = keywords.slice(100, 200);

    const [scores1, scores2] = await Promise.all([
      scoreRelevance(batch1, context).catch(() => new Map<string, number>()),
      batch2.length > 0
        ? scoreRelevance(batch2, context).catch(() => new Map<string, number>())
        : Promise.resolve(new Map<string, number>()),
    ]);

    // Merge into a single object
    const scores: Record<string, number> = {};
    for (const [k, v] of scores1) scores[k] = v;
    for (const [k, v] of scores2) scores[k] = v;

    functions.logger.info(`Relevance scored ${Object.keys(scores).length} keywords via async endpoint`);
    res.json({ scores });
  } catch (err: any) {
    functions.logger.error('Relevance scoring error:', err.message);
    res.status(500).json({ error: 'Scoring failed', details: err.message });
  }
});

/**
 * POST /api/search/forecast
 * Forecast keyword performance (paid users only)
 */
router.post('/forecast', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { keywords, dailyBudget } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    res.status(400).json({ error: 'Keywords required' });
    return;
  }
  if (keywords.length > 50) {
    res.status(400).json({ error: 'Maximum 50 keywords per forecast' });
    return;
  }
  if (!dailyBudget || dailyBudget <= 0) {
    res.status(400).json({ error: 'Valid daily budget required' });
    return;
  }

  // Check paid status
  const userDoc = await db.doc(`users/${userId}`).get();
  const userData = userDoc.data();
  const plan = userData?.plan || 'free';
  const email = userData?.email || '';
  const ADMIN_EMAILS = ['smythmyke@gmail.com'];
  const isAdmin = ADMIN_EMAILS.includes(email);

  if (!isAdmin && plan !== 'pro' && plan !== 'agency') {
    res.status(403).json({ error: 'Budget Calculator is available for Pro and Agency subscribers' });
    return;
  }

  try {
    const forecast = await forecastKeywords(keywords, dailyBudget);
    functions.logger.info(`Forecast: ${keywords.length} keywords, budget $${dailyBudget}/day, estimate: ${forecast.isEstimate}`);
    res.json(forecast);
  } catch (error: any) {
    functions.logger.error('Forecast error:', error.message);
    res.status(500).json({ error: 'Forecast failed', details: error.message });
  }
});

/**
 * GET /api/search/:searchId
 * Retrieve saved search results
 */
router.get('/:searchId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { searchId } = req.params;

  const doc = await db.doc(`users/${userId}/searches/${searchId}`).get();
  if (!doc.exists) {
    res.status(404).json({ error: 'Search not found' });
    return;
  }

  res.json(doc.data());
});

/**
 * GET /api/search
 * List user's saved searches
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const snapshot = await db.collection(`users/${userId}/searches`)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const searches = snapshot.docs.map((doc) => ({
    id: doc.id,
    query: doc.data().query,
    productLabel: doc.data().productLabel || null,
    mode: doc.data().mode,
    paid: doc.data().paid,
    createdAt: doc.data().createdAt,
    totalKeywords: doc.data().metadata?.totalKeywords || 0,
  }));

  res.json({ searches });
});

/**
 * POST /api/search/:searchId/refine
 * Add keywords to a specific category (Pro/Agency/Admin only)
 */
router.post('/:searchId/refine', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { searchId } = req.params;
  const { input, category } = req.body;

  if (!input?.trim() || !category) {
    res.status(400).json({ error: 'Input and category required' });
    return;
  }

  if (category === 'direct') {
    res.status(400).json({ error: 'Cannot refine Direct / Head Terms' });
    return;
  }

  // Check user plan — must be Pro, Agency, or Admin
  const userDoc = await db.doc(`users/${userId}`).get();
  const userData = userDoc.data();
  const plan = userData?.plan || 'free';
  const email = userData?.email || '';
  const ADMIN_EMAILS = ['smythmyke@gmail.com'];
  const isAdmin = ADMIN_EMAILS.includes(email);

  if (!isAdmin && plan !== 'pro' && plan !== 'agency') {
    res.status(403).json({ error: 'Refine is available for Pro and Agency subscribers' });
    return;
  }

  // Load existing search
  const searchDoc = await db.doc(`users/${userId}/searches/${searchId}`).get();
  if (!searchDoc.exists) {
    res.status(404).json({ error: 'Search not found' });
    return;
  }

  const searchData = searchDoc.data() as any;

  // Check refine count (max 5 per search)
  const refineCount = searchData.refineCount || 0;
  if (refineCount >= 5) {
    res.status(400).json({ error: 'Maximum 5 refinements per search reached' });
    return;
  }

  try {
    // Step 1: Gemini generates category-specific seeds
    functions.logger.info(`Refine: generating seeds for "${category}" with input "${input}"`);
    const seeds = await generateRefineSeeds(input, category, searchData.query || searchData.productLabel || '');

    // Step 2: Enrich via Keyword Planner
    functions.logger.info(`Refine: enriching ${seeds.length} seeds`);
    const enriched = await enrichKeywords(seeds);

    // Step 3: Score
    const scored = enriched.map((kw) => {
      const { calculateAdScore, calculateSeoScore } = require('@jackpotkeywords/shared');
      const adScore = calculateAdScore(
        kw.avgMonthlySearches, kw.lowCpc, kw.highCpc,
        kw.competition, kw.relevance, kw.trendDirection, searchData.budget,
      );
      const seoScore = calculateSeoScore(
        kw.avgMonthlySearches, kw.lowCpc, kw.highCpc,
        kw.competition, kw.relevance, kw.trendDirection,
      );
      return { ...kw, jackpotScore: adScore, adScore, seoScore };
    });

    // Step 4: Deduplicate against existing keywords
    const existingKeys = new Set(
      (searchData.keywords || []).map((kw: any) => kw.keyword.toLowerCase().trim()),
    );
    const newKeywords = scored.filter((kw) => !existingKeys.has(kw.keyword.toLowerCase().trim()));

    functions.logger.info(`Refine: ${newKeywords.length} new keywords (${scored.length - newKeywords.length} duplicates removed)`);

    // Step 5: Append and save
    const updatedKeywords = [...(searchData.keywords || []), ...newKeywords];
    await db.doc(`users/${userId}/searches/${searchId}`).update({
      keywords: JSON.parse(JSON.stringify(updatedKeywords)),
      refineCount: refineCount + 1,
    });

    res.json({
      added: newKeywords.length,
      refineCount: refineCount + 1,
      keywords: newKeywords,
    });
  } catch (error: any) {
    functions.logger.error('Refine error:', error.message);
    res.status(500).json({ error: 'Refine failed', details: error.message });
  }
});

function mergeAndDeduplicate(
  aiSeeds: { keyword: string; category: string; source: string }[],
  autocompleteKeywords: { keyword: string; source: string; parentSeed?: string }[],
): { keyword: string; category: string; source: string }[] {
  const seen = new Set<string>();
  const merged: { keyword: string; category: string; source: string }[] = [];

  // Build seed→category lookup for category inheritance
  const seedCategoryMap = new Map<string, string>();
  for (const seed of aiSeeds) {
    seedCategoryMap.set(seed.keyword.toLowerCase().trim(), seed.category);
  }

  for (const seed of aiSeeds) {
    const key = seed.keyword.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(seed);
    }
  }

  for (const kw of autocompleteKeywords) {
    const key = kw.keyword.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      // Inherit category: 1) from parent seed, 2) word overlap with seeds, 3) pattern matching
      const parentCategory = kw.parentSeed
        ? seedCategoryMap.get(kw.parentSeed.toLowerCase().trim())
        : undefined;
      const overlapCategory = !parentCategory
        ? inferCategoryFromSeeds(kw.keyword, seedCategoryMap as any)
        : null;
      merged.push({ ...kw, category: parentCategory || overlapCategory || inferCategory(kw.keyword) });
    }
  }

  return merged;
}


export default router;
