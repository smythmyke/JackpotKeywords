import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from '../middleware/auth';
import { checkAndDeductCredits, refundCredits } from '../middleware/credits';
import { generateSeeds, generateRefineSeeds } from '../services/gemini';
import { inferCategory, inferCategoryFromSeeds } from '../services/categoryInference';
import { expandAutocomplete, discoverCompetitors } from '../services/autocomplete';
import { enrichKeywords } from '../services/keywordPlanner';
import { overlayTrends } from '../services/googleTrends';
import { scoreAndClassify } from '../services/gemini';
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
  const { description, url, mode, budget } = req.body as SearchRequest;

  if (!description?.trim() && !url?.trim()) {
    res.status(400).json({ error: 'Description or URL required' });
    return;
  }

  // Step 0: Check and deduct credits (skip for anonymous)
  let creditResult = { allowed: true, newBalance: 0, isFreeSearch: true };
  if (!isAnonymous) {
    const operation = mode === 'concept' ? 'concept_search' : 'keyword_search';
    creditResult = await checkAndDeductCredits(userId, 1, operation, `${mode} search`);

    if (!creditResult.allowed) {
      res.status(402).json({
        error: 'Insufficient credits',
        balance: creditResult.newBalance,
      });
      return;
    }
  }

  try {
    // Step 1: AI seed generation
    functions.logger.info('Step 1: Generating seeds...');
    const seeds = await generateSeeds(description, url, mode);
    functions.logger.info(`Step 1 done: ${seeds.allSeeds.length} seeds, ${seeds.topSeeds.length} top seeds`);

    // Step 1b: Autocomplete competitor discovery
    functions.logger.info('Step 1b: Discovering competitors via autocomplete...');
    const competitorSeeds = await discoverCompetitors(seeds.productLabel, seeds.allSeeds);
    if (competitorSeeds.length > 0) {
      seeds.allSeeds.push(...competitorSeeds);
      functions.logger.info(`Step 1b done: discovered ${competitorSeeds.length} additional competitor seeds`);
    }

    // Step 2: Autocomplete expansion
    functions.logger.info('Step 2: Expanding via autocomplete...');
    const autocompleteKeywords = await expandAutocomplete(seeds.topSeeds);
    functions.logger.info(`Step 2 done: ${autocompleteKeywords.length} autocomplete keywords`);

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
    const scored = await scoreAndClassify(withTrends, description, mode, budget);
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

    const result: SearchResult = {
      id: searchId,
      query: description,
      productLabel: seeds.productLabel,
      url: url || '',
      mode,
      budget: budget || 0,
      createdAt: new Date().toISOString(),
      paid,
      keywords: scored.keywords,
      categories: scored.categories,
      conceptReport: scored.conceptReport || undefined,
      metadata: {
        seedCount: seeds.allSeeds.length,
        autocompleteCount: autocompleteKeywords.length,
        plannerRelatedCount: enriched.length - masterList.length,
        trendsOverlayCount: withTrends.filter((k) => k.trendDirection).length,
        totalKeywords: scored.keywords.length,
        executionTimeMs: Date.now() - startTime,
      },
    };

    // Save to Firestore for authenticated users only
    if (!isAnonymous) {
      const kwWithVols = result.keywords.filter((kw) => kw.monthlyVolumes && kw.monthlyVolumes.length > 0);
      functions.logger.info(`Saving: ${result.keywords.length} keywords, ${kwWithVols.length} with monthlyVolumes`);
      const firestoreData = JSON.parse(JSON.stringify(result));
      await db.doc(`users/${userId}/searches/${searchId}`).set(firestoreData);
    } else {
      functions.logger.info(`Anonymous search: ${result.keywords.length} keywords (not saved)`);
    }

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
 * POST /api/search/save-anonymous
 * Save anonymous search results to authenticated user's account
 */
router.post('/save-anonymous', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { result } = req.body;

  if (!result || !result.keywords) {
    res.status(400).json({ error: 'Invalid result data' });
    return;
  }

  try {
    // Deduct a free search
    const creditResult = await checkAndDeductCredits(userId, 1, 'keyword_search', 'saved anonymous search');
    const paid = creditResult.allowed && !creditResult.isFreeSearch;

    const searchId = db.collection('users').doc().id;
    const savedResult = {
      ...result,
      id: searchId,
      paid,
      createdAt: new Date().toISOString(),
    };

    const firestoreData = JSON.parse(JSON.stringify(savedResult));
    await db.doc(`users/${userId}/searches/${searchId}`).set(firestoreData);

    functions.logger.info(`Saved anonymous result: ${searchId} for user ${userId}`);
    res.json({ id: searchId });
  } catch (error: any) {
    functions.logger.error('Save anonymous error:', error.message);
    res.status(500).json({ error: 'Failed to save results' });
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
