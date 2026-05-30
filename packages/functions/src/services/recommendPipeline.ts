/**
 * Shared keyword-recommendation pipeline.
 *
 * Extracted from the /v1/recommend and /v1/recommend-deep handlers so every
 * surface that produces ranked keyword recommendations runs the SAME pipeline —
 * the public REST endpoints today, the OpenAI/ChatGPT MCP tool next. Honors the
 * "one API, many surfaces" rule: callers wrap this with their own
 * billing/quota/auth; the pipeline itself is billing-agnostic.
 *
 * Behavior is identical to the previous inline handler code. The only branch is
 * `deep`: when set, competitor discovery runs (in parallel with autocomplete)
 * and the cluster/category/competitor aggregates are returned alongside the
 * recommendations. Non-deep callers simply ignore those fields.
 */

import {
  extractProductContext,
  generateSeeds,
  scoreAndClassify,
} from './gemini';
import {
  expandAutocomplete,
  discoverCompetitors,
} from './autocomplete';
import { enrichKeywords } from './keywordPlanner';
import { fetchAndParse } from './htmlParser';
import { overlayTrends } from './googleTrends';
import { inferCategory } from './categoryInference';

export interface RecommendPipelineInput {
  description?: string;
  url?: string;
  budget?: number;
  location?: string;
  /** Resolved + clamped by the caller (default 50, max 200). */
  limit: number;
}

export interface RecommendPipelineOptions {
  /** Run competitor discovery and return cluster/category/competitor aggregates. */
  deep?: boolean;
}

export interface RecommendationItem {
  keyword: string;
  monthlyVolume: number;
  lowCpc: number;
  highCpc: number;
  competition: string;
  jackpotScore: number;
  intent?: string;
  category?: string;
  trendDirection?: string;
  suggestHits?: number;
}

export interface RecommendPipelineResult {
  productName?: string;
  query: string;
  url: string;
  recommendations: RecommendationItem[];
  totalCandidates: number;
  returned: number;
  /** Present only when opts.deep is set. */
  clusters?: unknown;
  categories?: unknown;
  competitors?: unknown;
}

export async function runRecommendPipeline(
  input: RecommendPipelineInput,
  opts: RecommendPipelineOptions = {},
): Promise<RecommendPipelineResult> {
  const { description, url, budget, location, limit } = input;
  const deep = opts.deep === true;

  // Step 0: Optional URL fetch + product context extraction
  let parsedPage: Awaited<ReturnType<typeof fetchAndParse>> | undefined;
  if (url) {
    parsedPage = await fetchAndParse(url.toString());
  }
  const context = await extractProductContext(
    (description || '').toString(),
    url ? url.toString() : undefined,
    parsedPage,
  );

  // Step 1: AI seed generation
  const seeds = await generateSeeds(context, location);

  // Step 1b + 2: autocomplete expansion. In deep mode, competitor discovery
  // runs in parallel and its seeds broaden KP enrichment downstream.
  let autocompleteKeywords;
  if (deep) {
    const [competitorSeeds, ac] = await Promise.all([
      discoverCompetitors(seeds.productLabel, seeds.allSeeds),
      expandAutocomplete(seeds.topSeeds),
    ]);
    if (competitorSeeds.length > 0) {
      seeds.allSeeds.push(...competitorSeeds);
    }
    autocompleteKeywords = ac;
  } else {
    // Non-deep skips competitor discovery (adds 5+ seconds); competitors are
    // surfaced separately via context.competitors anyway.
    autocompleteKeywords = await expandAutocomplete(seeds.topSeeds);
  }

  // Step 3: Merge & dedupe seeds + autocomplete keywords
  const sourceCounts = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const masterList: { keyword: string; category: string; source: string }[] = [];
  for (const seed of seeds.allSeeds) {
    const key = seed.keyword.toLowerCase().trim();
    const set = sourceCounts.get(key) ?? new Set<string>();
    set.add(seed.source);
    sourceCounts.set(key, set);
    if (!seen.has(key)) {
      seen.add(key);
      masterList.push(seed);
    }
  }
  for (const kw of autocompleteKeywords) {
    const key = kw.keyword.toLowerCase().trim();
    const set = sourceCounts.get(key) ?? new Set<string>();
    set.add(kw.source);
    sourceCounts.set(key, set);
    if (!seen.has(key)) {
      seen.add(key);
      masterList.push({ ...kw, category: inferCategory(kw.keyword) });
    }
  }

  // Step 4: Google Ads Keyword Planner enrichment
  const enriched = await enrichKeywords(masterList);
  for (const kw of enriched) {
    const key = kw.keyword.toLowerCase().trim();
    const src = (kw as any).source;
    if (src) {
      const set = sourceCounts.get(key) ?? new Set<string>();
      set.add(src);
      sourceCounts.set(key, set);
    }
  }
  let maxPlatforms = 1;
  for (const set of sourceCounts.values()) {
    if (set.size > maxPlatforms) maxPlatforms = set.size;
  }

  // Step 5: Google Trends overlay
  const withTrends = await overlayTrends(enriched);

  // Step 6: AI scoring + classification (writes jackpotScore + jackpotScore_v2)
  const scored = await scoreAndClassify(withTrends, context, budget, { sourceCounts, maxPlatforms });

  // Sort by v2 (composite) score descending and trim to limit
  scored.keywords.sort((a, b) => (b.jackpotScore_v2 ?? b.jackpotScore) - (a.jackpotScore_v2 ?? a.jackpotScore));
  const recommendations: RecommendationItem[] = scored.keywords.slice(0, limit).map((kw) => ({
    keyword: kw.keyword,
    monthlyVolume: kw.avgMonthlySearches,
    lowCpc: kw.lowCpc,
    highCpc: kw.highCpc,
    competition: kw.competition,
    jackpotScore: kw.jackpotScore_v2 ?? kw.jackpotScore,
    intent: kw.intent,
    category: kw.category,
    trendDirection: kw.trendDirection,
    suggestHits: kw.suggestHits,
  }));

  const result: RecommendPipelineResult = {
    productName: context.productName || context.productLabel,
    query: (description || '').toString(),
    url: (url || '').toString(),
    recommendations,
    totalCandidates: scored.keywords.length,
    returned: recommendations.length,
  };
  if (deep) {
    result.clusters = scored.clusters;
    result.categories = scored.categories;
    result.competitors = context.competitors;
  }
  return result;
}
