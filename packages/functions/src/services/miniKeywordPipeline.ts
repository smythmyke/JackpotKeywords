import * as functions from 'firebase-functions';
import type { MiniKeywordResult } from '@jackpotkeywords/shared';
import { enrichKeywords } from './keywordPlanner';

const MAX_SEEDS = 50;

/**
 * Runs a stripped-down keyword enrichment for the SEO audit preview.
 * Skips Gemini (seeds, scoring, clustering), autocomplete, and trends —
 * Keyword Planner only — so it finishes in ~3-5s instead of 30-60s.
 *
 * Seeds come from the audit's gap.sampleKeywords[], which Gemini already
 * produced as part of the audit. No additional LLM calls.
 */
export async function runMiniKeywordPipeline(seeds: string[]): Promise<MiniKeywordResult[]> {
  const unique = [
    ...new Set(
      seeds
        .map((s) => (s || '').trim())
        .filter((s) => s.length > 0 && s.length < 80),
    ),
  ].slice(0, MAX_SEEDS);

  if (unique.length === 0) {
    functions.logger.info('Mini pipeline: no seeds, returning empty list');
    return [];
  }

  const masterList = unique.map((keyword) => ({ keyword, category: 'audit_gap', source: 'audit' }));

  try {
    const enriched = await enrichKeywords(masterList);
    const mapped: MiniKeywordResult[] = enriched.map((k) => ({
      keyword: k.keyword,
      monthlyVolume: k.avgMonthlySearches ?? 0,
      lowCpc: k.lowCpc ?? 0,
      highCpc: k.highCpc ?? 0,
      competition: ((k.competition ?? 'UNKNOWN') as MiniKeywordResult['competition']),
    }));
    mapped.sort((a, b) => b.monthlyVolume - a.monthlyVolume);
    functions.logger.info(`Mini pipeline: enriched ${mapped.length} keywords from ${unique.length} seeds`);
    return mapped;
  } catch (err: any) {
    functions.logger.warn(`Mini pipeline failed: ${err.message || err}`);
    return [];
  }
}
