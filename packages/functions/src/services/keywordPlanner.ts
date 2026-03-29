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
 * Also calculates trend direction from monthly_search_volumes
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

  const seedLookup = new Map<string, { category: string; source: string }>();
  for (const seed of masterList) {
    seedLookup.set(seed.keyword.toLowerCase().trim(), {
      category: seed.category,
      source: seed.source,
    });
  }

  functions.logger.info(`Enriching ${allKeywords.length} keywords in ${batches.length} batches`);

  for (const batch of batches) {
    try {
      const response: any = await customer.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: CUSTOMER_ID,
        language: 'languageConstants/1000',
        geo_target_constants: ['geoTargetConstants/2840'],
        keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
        keyword_seed: { keywords: batch },
      } as any);

      for (const idea of response || []) {
        const keyword = idea.text || '';
        const key = keyword.toLowerCase().trim();
        if (!key || results.has(key)) continue;

        const metrics = idea.keyword_idea_metrics || {} as any;
        const avgSearches = Number(metrics.avg_monthly_searches) || 0;
        const competition = mapCompetition(metrics.competition);
        const lowCpc = Number(metrics.low_top_of_page_bid_micros) / 1_000_000 || 0;
        const highCpc = Number(metrics.high_top_of_page_bid_micros) / 1_000_000 || 0;

        // Calculate trend from monthly_search_volumes
        const trend = analyzeTrendFromVolumes(metrics.monthly_search_volumes);

        // Extract monthly volumes for charts
        const monthlyVolumes = (metrics.monthly_search_volumes || []).map((m: any) => ({
          month: String(m.month || '').substring(0, 3),
          volume: Number(m.monthly_searches) || 0,
        }));

        const seedInfo = seedLookup.get(key);

        // For planner-related keywords: infer category from seed overlap or patterns
        const inferredCategory = !seedInfo
          ? (inferCategoryFromSeeds(keyword, seedLookup) || inferCategory(keyword))
          : seedInfo.category;

        results.set(key, {
          keyword,
          category: inferredCategory as any,
          source: (seedInfo?.source || 'planner_related') as any,
          avgMonthlySearches: avgSearches,
          lowCpc,
          highCpc,
          competition,
          jackpotScore: 0,
          adScore: 0,
          seoScore: 0,
          relevance: seedInfo ? 4 : 3,
          opportunityType: 'quick_win',
          trendDirection: trend?.direction,
          trendInfo: trend?.info,
          monthlyVolumes: monthlyVolumes.length > 0 ? monthlyVolumes : undefined,
        });
      }
    } catch (error: any) {
      functions.logger.warn(`Batch enrichment error: ${error.message}`);
    }
  }

  const allResults = Array.from(results.values());
  const withVolumes = allResults.filter((kw) => kw.monthlyVolumes && kw.monthlyVolumes.length > 0);
  functions.logger.info(`Enriched: ${allResults.length} unique keywords from Keyword Planner (${withVolumes.length} with monthly volumes)`);
  if (withVolumes.length > 0) {
    functions.logger.info(`Sample monthlyVolumes: ${JSON.stringify(withVolumes[0].monthlyVolumes)}`);
  }
  return allResults;
}

function analyzeTrendFromVolumes(
  monthlyVolumes: any[] | undefined,
): { direction: TrendDirection; info: string } | null {
  if (!monthlyVolumes || monthlyVolumes.length < 6) return null;

  const values = monthlyVolumes.map((m: any) => Number(m.monthly_searches) || 0);

  // Compare first half avg to second half avg
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

  // Detect seasonality (high variance relative to mean)
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
