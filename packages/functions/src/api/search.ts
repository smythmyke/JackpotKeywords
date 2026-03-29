import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { checkAndDeductCredits, refundCredits } from '../middleware/credits';
import { generateSeeds } from '../services/gemini';
import { expandAutocomplete } from '../services/autocomplete';
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
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  const userId = req.userId!;
  const { description, url, mode, budget } = req.body as SearchRequest;

  if (!description?.trim() && !url?.trim()) {
    res.status(400).json({ error: 'Description or URL required' });
    return;
  }

  // Step 0: Check and deduct credits
  const operation = mode === 'concept' ? 'concept_search' : 'keyword_search';
  const creditResult = await checkAndDeductCredits(userId, 1, operation, `${mode} search`);

  if (!creditResult.allowed) {
    res.status(402).json({
      error: 'Insufficient credits',
      balance: creditResult.newBalance,
    });
    return;
  }

  try {
    // Step 1: AI seed generation
    functions.logger.info('Step 1: Generating seeds...');
    const seeds = await generateSeeds(description, url, mode);
    functions.logger.info(`Step 1 done: ${seeds.allSeeds.length} seeds, ${seeds.topSeeds.length} top seeds`);

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
    const searchId = db.collection('users').doc().id;
    const paid = !creditResult.isFreeSearch;

    const result: SearchResult = {
      id: searchId,
      query: description,
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

    // Save to Firestore (strip undefined values)
    const firestoreData = JSON.parse(JSON.stringify(result));
    await db.doc(`users/${userId}/searches/${searchId}`).set(firestoreData);

    res.json(result);
  } catch (error: any) {
    functions.logger.error('Search pipeline error:', error.stack || error.message);
    // Refund credit on pipeline failure
    await refundCredits(userId, 1, `Search failed: ${error.message}`);
    res.status(500).json({ error: 'Search pipeline failed', details: error.message });
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
    mode: doc.data().mode,
    paid: doc.data().paid,
    createdAt: doc.data().createdAt,
    totalKeywords: doc.data().metadata?.totalKeywords || 0,
  }));

  res.json({ searches });
});

function mergeAndDeduplicate(
  aiSeeds: { keyword: string; category: string; source: string }[],
  autocompleteKeywords: { keyword: string; source: string }[],
): { keyword: string; category: string; source: string }[] {
  const seen = new Set<string>();
  const merged: { keyword: string; category: string; source: string }[] = [];

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
      merged.push({ ...kw, category: 'direct' });
    }
  }

  return merged;
}

export default router;
