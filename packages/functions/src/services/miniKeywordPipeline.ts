import * as functions from 'firebase-functions';
import type { MiniKeywordResult } from '@jackpotkeywords/shared';
import { extractProductContext, generateSeeds, scoreRelevance } from './gemini';
import { expandAutocomplete } from './autocomplete';
import { enrichKeywords } from './keywordPlanner';

const MAX_AUTOCOMPLETE_SEEDS = 5;
const MIN_DISPLAY_VOLUME = 10;
const MIN_RELEVANCE = 5;
const TOP_BY_VOLUME_CAP = 500;
const SCORE_BATCH_SIZE = 100;

/**
 * Full Path-C mini pipeline for the audit's keyword preview:
 *   1. Gemini extractProductContext on the audit URL
 *   2. Gemini generateSeeds → ~50-70 short search-style seeds
 *   3. Google Autocomplete a-z expansion on top 5 seeds (free, real queries)
 *   4. Google Ads Keyword Planner enrichment
 *   5. Filter volume < MIN_DISPLAY_VOLUME (drops zero-volume dead weight)
 *   6. Cap to top TOP_BY_VOLUME_CAP by volume — KP can return 3000+ rows for
 *      broad seeds. 500 gives niche businesses (patent/IP, where high-relevance
 *      terms have low KP volume) enough headroom to surface in scoring.
 *   7. Gemini relevance scoring in parallel batches + filter aiRelevance < MIN_RELEVANCE
 *   8. Sort by volume × (aiRelevance/10) so volume still matters but
 *      off-topic high-volume terms (BI/ERP/data-viz for a patent firm) lose.
 *
 * Parallel batching keeps the scoring step at ~25-40s wallclock regardless of
 * keyword count (5 batches in parallel ≈ time of one batch). Audit's keyword
 * preview is still a teaser — dedicated /api/search is the comprehensive tool.
 */
export async function runMiniKeywordPipeline(auditUrl: string): Promise<MiniKeywordResult[]> {
  if (!auditUrl) {
    functions.logger.info('Mini pipeline: no URL provided');
    return [];
  }

  try {
    functions.logger.info(`Mini pipeline: extractProductContext for ${auditUrl}`);
    const context = await extractProductContext('', auditUrl);

    functions.logger.info(`Mini pipeline: generateSeeds (skipSeasonal=true)`);
    const seedResult = await generateSeeds(context, undefined, { skipSeasonal: true });
    const aiSeeds = seedResult.allSeeds;
    const topSeeds = seedResult.topSeeds.slice(0, MAX_AUTOCOMPLETE_SEEDS);
    functions.logger.info(`Mini pipeline: ${aiSeeds.length} AI seeds, expanding top ${topSeeds.length}`);

    let autocompleteKeywords: { keyword: string; source: string; parentSeed?: string }[] = [];
    try {
      autocompleteKeywords = await expandAutocomplete(topSeeds);
    } catch (err: any) {
      functions.logger.warn(`Mini pipeline: autocomplete failed (non-fatal): ${err.message}`);
    }

    // Merge + dedupe: AI seeds + autocomplete expansions
    const seen = new Set<string>();
    const masterList: { keyword: string; category: string; source: string }[] = [];
    for (const s of aiSeeds) {
      const key = s.keyword.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        masterList.push(s);
      }
    }
    for (const a of autocompleteKeywords) {
      const key = a.keyword.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        masterList.push({ keyword: a.keyword, category: 'autocomplete', source: 'autocomplete' });
      }
    }
    functions.logger.info(`Mini pipeline: ${masterList.length} unique seeds → Keyword Planner`);

    const enriched = await enrichKeywords(masterList);

    // Volume filter, then cap to top-N by volume. KP can return 3000+ rows for
    // broad seeds. The cap keeps Gemini cost bounded while leaving headroom for
    // niche businesses (e.g. patent/IP firms whose relevant keywords have low
    // KP volume) to make it into the scoring window.
    const topByVolume = enriched
      .filter((k) => (k.avgMonthlySearches ?? 0) >= MIN_DISPLAY_VOLUME)
      .sort((a, b) => (b.avgMonthlySearches ?? 0) - (a.avgMonthlySearches ?? 0))
      .slice(0, TOP_BY_VOLUME_CAP);
    functions.logger.info(
      `Mini pipeline: ${topByVolume.length} after top-${TOP_BY_VOLUME_CAP} cap, scoring relevance`,
    );

    // Relevance scoring — chunked + parallel. With 500-cap and 100-batch, that's
    // up to 5 batches running concurrently, ~25-40s wallclock vs ~150s sequential.
    const keywordsToScore = topByVolume.map((k) => k.keyword);
    const batches: string[][] = [];
    for (let i = 0; i < keywordsToScore.length; i += SCORE_BATCH_SIZE) {
      batches.push(keywordsToScore.slice(i, i + SCORE_BATCH_SIZE));
    }
    const batchResults = await Promise.all(
      batches.map((batch) =>
        scoreRelevance(batch, context).catch((err: any) => {
          functions.logger.warn(
            `Mini pipeline: scoreRelevance batch failed: ${err.message}`,
          );
          return new Map<string, number>();
        }),
      ),
    );
    const relevanceScores = new Map<string, number>();
    for (const map of batchResults) {
      for (const [k, v] of map) relevanceScores.set(k, v);
    }

    type ScoredKeyword = MiniKeywordResult & { _aiRelevance: number | undefined };
    const scored: ScoredKeyword[] = topByVolume.map((k) => ({
      keyword: k.keyword,
      monthlyVolume: k.avgMonthlySearches ?? 0,
      lowCpc: k.lowCpc ?? 0,
      highCpc: k.highCpc ?? 0,
      competition: ((k.competition ?? 'UNKNOWN') as MiniKeywordResult['competition']),
      _aiRelevance: relevanceScores.get(k.keyword),
    }));

    const mapped: MiniKeywordResult[] = scored
      // Drop low-relevance (but keep unscored rows so a scoring failure doesn't
      // wipe the audit). Unscored rows rank as if relevance=10 (no penalty).
      .filter((k) => k._aiRelevance === undefined || k._aiRelevance >= MIN_RELEVANCE)
      .sort((a, b) => {
        const scoreA = a.monthlyVolume * ((a._aiRelevance ?? 10) / 10);
        const scoreB = b.monthlyVolume * ((b._aiRelevance ?? 10) / 10);
        return scoreB - scoreA;
      })
      .map(({ _aiRelevance, ...rest }) => rest);

    functions.logger.info(
      `Mini pipeline: ${mapped.length} keywords after relevance filter (scored ${relevanceScores.size} of ${topByVolume.length})`,
    );
    return mapped;
  } catch (err: any) {
    functions.logger.warn(`Mini pipeline failed: ${err.message || err}`);
    return [];
  }
}
