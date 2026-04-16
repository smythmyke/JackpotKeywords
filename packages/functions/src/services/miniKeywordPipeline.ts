import * as functions from 'firebase-functions';
import type { MiniKeywordResult } from '@jackpotkeywords/shared';
import { extractProductContext, generateSeeds } from './gemini';
import { expandAutocomplete } from './autocomplete';
import { enrichKeywords } from './keywordPlanner';

const MAX_AUTOCOMPLETE_SEEDS = 5;
const MIN_DISPLAY_VOLUME = 10;

/**
 * Full Path-C mini pipeline for the audit's keyword preview:
 *   1. Gemini extractProductContext on the audit URL
 *   2. Gemini generateSeeds → ~50-70 short search-style seeds
 *   3. Google Autocomplete a-z expansion on top 5 seeds (free, real queries)
 *   4. Google Ads Keyword Planner enrichment
 *   5. Filter volume < MIN_DISPLAY_VOLUME (drops zero-volume dead weight)
 *
 * Runs ~10-18s total. Lazy-loaded from the frontend so users see the audit
 * instantly while the preview streams in behind. Cheaper than the full
 * keyword pipeline (no trends, no Gemini scoring, no clustering) but uses
 * the same seed-generation machinery, so KP hit rate matches the full tool.
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
    const mapped: MiniKeywordResult[] = enriched
      .map((k) => ({
        keyword: k.keyword,
        monthlyVolume: k.avgMonthlySearches ?? 0,
        lowCpc: k.lowCpc ?? 0,
        highCpc: k.highCpc ?? 0,
        competition: ((k.competition ?? 'UNKNOWN') as MiniKeywordResult['competition']),
      }))
      .filter((k) => k.monthlyVolume >= MIN_DISPLAY_VOLUME)
      .sort((a, b) => b.monthlyVolume - a.monthlyVolume);

    functions.logger.info(`Mini pipeline: ${mapped.length} keywords after volume filter`);
    return mapped;
  } catch (err: any) {
    functions.logger.warn(`Mini pipeline failed: ${err.message || err}`);
    return [];
  }
}
