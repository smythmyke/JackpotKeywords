import { GoogleAdsApi, enums } from 'google-ads-api';
import * as functions from 'firebase-functions';
import type { KeywordResult, CompetitionLevel, TrendDirection } from '@jackpotkeywords/shared';
import { inferCategory, inferCategoryFromSeeds } from './categoryInference';

const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID || '';
const DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN || '';

const BATCH_SIZE = 20;
const CONCURRENCY = 3;
const MAX_RETRIES = 2;

// Generic words to exclude from seed word matching
// These are too common to be meaningful for filtering KP related keywords
const GENERIC_WORDS = new Set([
  // Function words
  'the', 'and', 'for', 'with', 'from', 'your', 'that', 'this', 'what', 'how',
  'can', 'does', 'will', 'are', 'not', 'get', 'use', 'make', 'way', 'one',
  // Generic tech/product terms
  'tool', 'tools', 'app', 'apps', 'software', 'platform', 'service', 'services',
  'chrome', 'extension', 'plugin', 'website', 'site', 'web',
  // Generic qualifiers
  'best', 'free', 'top', 'good', 'great', 'easy', 'simple', 'fast', 'quick',
  'new', 'online', 'help', 'tips', 'guide', 'review', 'reviews',
  // Generic commerce terms (too broad — "shop" matches "ACLU shop", "coffee shop", etc.)
  'buy', 'shop', 'store', 'cost', 'price', 'pricing', 'plan', 'plans',
  'sale', 'deal', 'deals', 'order', 'pay', 'money',
  // Generic action words
  'create', 'start', 'learn', 'find', 'search', 'look', 'need', 'want',
  'work', 'works', 'using', 'used',
  // Common filler
  'like', 'just', 'also', 'more', 'most', 'very', 'really', 'about',
  'meaning', 'mean', 'means', 'definition',
]);

function getClient() {
  const api = new GoogleAdsApi({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    developer_token: DEV_TOKEN,
  });
  return api.Customer({
    customer_id: CUSTOMER_ID,
    refresh_token: REFRESH_TOKEN,
  });
}

/**
 * Step 4: Enrich keywords with Google Ads Keyword Planner data
 * Hybrid approach: keeps all seed keywords + KP related that share meaningful words with seeds
 */
export async function enrichKeywords(
  masterList: { keyword: string; category: string; source: string }[],
): Promise<KeywordResult[]> {
  const customer = getClient();
  const results = new Map<string, KeywordResult>();

  const allKeywords = masterList.map((s) => s.keyword);
  const batches: string[][] = [];
  for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
    batches.push(allKeywords.slice(i, i + BATCH_SIZE));
  }

  // Build seed lookup and meaningful word set
  const seedLookup = new Map<string, { category: string; source: string }>();
  const meaningfulSeedWords = new Set<string>();
  for (const seed of masterList) {
    const key = seed.keyword.toLowerCase().trim();
    seedLookup.set(key, { category: seed.category, source: seed.source });
    for (const word of key.split(/\s+/)) {
      if (word.length > 2 && !GENERIC_WORDS.has(word)) {
        meaningfulSeedWords.add(word);
      }
    }
  }

  functions.logger.info(`Enriching ${allKeywords.length} keywords in ${batches.length} batches (${meaningfulSeedWords.size} meaningful seed words)`);

  let kpKept = 0;
  let kpDropped = 0;

  // Process batches in parallel groups for speed
  const allResponses: any[][] = [];

  for (let g = 0; g < batches.length; g += CONCURRENCY) {
    const group = batches.slice(g, g + CONCURRENCY);
    const settled = await Promise.allSettled(
      group.map(async (batch) => {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const response: any = await customer.keywordPlanIdeas.generateKeywordIdeas({
              customer_id: CUSTOMER_ID,
              language: 'languageConstants/1000',
              geo_target_constants: ['geoTargetConstants/2840'],
              keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
              keyword_seed: { keywords: batch },
            } as any);
            return response || [];
          } catch (err: any) {
            const errStr = JSON.stringify(err)?.substring(0, 200) || '';
            const isRateLimit = errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Too many requests');
            if (isRateLimit && attempt < MAX_RETRIES) {
              const delay = (attempt + 1) * 5000;
              functions.logger.info(`Rate limited, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            throw err;
          }
        }
        return [];
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        allResponses.push(result.value);
      } else {
        const err = result.reason;
        functions.logger.warn(`Batch enrichment error: ${err?.message || err?.statusMessage || JSON.stringify(err)?.substring(0, 500)}`);
      }
    }
  }

  // Process all responses
  for (const response of allResponses) {
    for (const idea of response) {
      const keyword = idea.text || '';
      const key = keyword.toLowerCase().trim();
      if (!key || results.has(key)) continue;

      const metrics = idea.keyword_idea_metrics || {} as any;
      const avgSearches = Number(metrics.avg_monthly_searches) || 0;
      const competition = mapCompetition(metrics.competition);
      const lowCpc = Number(metrics.low_top_of_page_bid_micros) / 1_000_000 || 0;
      const highCpc = Number(metrics.high_top_of_page_bid_micros) / 1_000_000 || 0;

      const seedInfo = seedLookup.get(key);
      const isSeed = !!seedInfo;

      // For KP-related keywords: only keep if they have volume AND share a meaningful word with seeds
      if (!isSeed) {
        const words = key.split(/\s+/).filter((w: string) => w.length > 2);
        const matchCount = words.filter((w: string) => meaningfulSeedWords.has(w)).length;
        if (avgSearches === 0 || matchCount < 1) {
          kpDropped++;
          continue;
        }
        kpKept++;
      }

      // Calculate trend from monthly_search_volumes
      const trend = analyzeTrendFromVolumes(metrics.monthly_search_volumes);

      // Extract monthly volumes for charts
      const monthlyVolumes = (metrics.monthly_search_volumes || []).map((m: any) => ({
        month: String(m.month || '').substring(0, 3),
        volume: Number(m.monthly_searches) || 0,
      }));

      // Infer category for KP-related keywords
      const inferredCategory = !isSeed
        ? (inferCategoryFromSeeds(keyword, seedLookup) || inferCategory(keyword))
        : seedInfo!.category;

      results.set(key, {
        keyword,
        category: inferredCategory as any,
        source: (isSeed ? seedInfo!.source : 'planner_related') as any,
        avgMonthlySearches: avgSearches,
        lowCpc,
        highCpc,
        competition,
        jackpotScore: 0,
        adScore: 0,
        seoScore: 0,
        relevance: isSeed ? 4 : 3,
        opportunityType: 'quick_win',
        trendDirection: trend?.direction,
        trendInfo: trend?.info,
        monthlyVolumes: monthlyVolumes.length > 0 ? monthlyVolumes : undefined,
      });
    }
  }

  const allResults = Array.from(results.values());
  const withVolumes = allResults.filter((kw) => kw.monthlyVolumes && kw.monthlyVolumes.length > 0);
  functions.logger.info(`Enriched: ${allResults.length} keywords (${kpKept} KP related kept, ${kpDropped} dropped, ${withVolumes.length} with monthly volumes)`);
  return allResults;
}

function analyzeTrendFromVolumes(
  monthlyVolumes: any[] | undefined,
): { direction: TrendDirection; info: string } | null {
  if (!monthlyVolumes || monthlyVolumes.length < 6) return null;

  const values = monthlyVolumes.map((m: any) => Number(m.monthly_searches) || 0);

  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half);
  const secondHalf = values.slice(half);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (firstAvg === 0 && secondAvg === 0) return { direction: 'stable', info: 'Low volume' };
  if (firstAvg === 0) return { direction: 'rising', info: 'New interest' };

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

  let direction: TrendDirection;
  let info: string;

  if (changePercent > 30) {
    direction = 'rising';
    info = `+${Math.round(changePercent)}% over 12mo`;
  } else if (changePercent > 10) {
    direction = 'rising_slight';
    info = `+${Math.round(changePercent)}% over 12mo`;
  } else if (changePercent > -10) {
    direction = 'stable';
    info = 'Stable';
  } else if (changePercent > -30) {
    direction = 'declining_slight';
    info = `${Math.round(changePercent)}% over 12mo`;
  } else {
    direction = 'declining';
    info = `${Math.round(changePercent)}% over 12mo`;
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean > 0) {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean;
    if (cv > 0.5) {
      info += ' (Seasonal)';
    }
  }

  return { direction, info };
}

function mapCompetition(competition: any): CompetitionLevel {
  if (!competition) return 'UNSPECIFIED';
  const str = String(competition).toUpperCase();
  if (str === 'LOW' || str === '2') return 'LOW';
  if (str === 'MEDIUM' || str === '3') return 'MEDIUM';
  if (str === 'HIGH' || str === '4') return 'HIGH';
  return 'UNSPECIFIED';
}
