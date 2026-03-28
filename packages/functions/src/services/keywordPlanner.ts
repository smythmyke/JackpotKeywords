import { GoogleAdsApi } from 'google-ads-api';
import * as functions from 'firebase-functions';
import type { KeywordResult, CompetitionLevel } from '@jackpotkeywords/shared';

const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID || '';
const DEV_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_ADS_REFRESH_TOKEN || '';

const BATCH_SIZE = 20; // API limit per request

/**
 * Step 4: Enrich keywords with Google Ads Keyword Planner data
 * Batches seeds into groups of 20 and queries the API
 */
export async function enrichKeywords(
  masterList: { keyword: string; category: string; source: string }[],
): Promise<KeywordResult[]> {
  const client = new GoogleAdsApi({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    developer_token: DEV_TOKEN,
  });

  const customer = client.Customer({
    customer_id: CUSTOMER_ID,
    refresh_token: REFRESH_TOKEN,
  });

  const results = new Map<string, KeywordResult>();

  // Batch the master list into groups of BATCH_SIZE
  const batches: string[][] = [];
  const allKeywords = masterList.map((s) => s.keyword);

  for (let i = 0; i < allKeywords.length; i += BATCH_SIZE) {
    batches.push(allKeywords.slice(i, i + BATCH_SIZE));
  }

  // Build a lookup for category/source
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
      const keywordPlanIdeaService = customer.keywordPlanIdeas;

      const response: any = await keywordPlanIdeaService.generateKeywordIdeas({
        customer_id: CUSTOMER_ID,
        language: 'languageConstants/1000', // English
        geo_target_constants: ['geoTargetConstants/2840'], // United States
        keyword_plan_network: 2, // GOOGLE_SEARCH
        keyword_seed: { keywords: batch },
      } as any);

      for (const idea of response || []) {
        const keyword = idea.text || '';
        const key = keyword.toLowerCase().trim();

        if (results.has(key)) continue;

        const metrics = idea.keyword_idea_metrics || {} as any;
        const avgSearches = Number(metrics.avg_monthly_searches) || 0;
        const competition = mapCompetition(metrics.competition);
        const lowCpc = Number(metrics.low_top_of_page_bid_micros) / 1_000_000 || 0;
        const highCpc = Number(metrics.high_top_of_page_bid_micros) / 1_000_000 || 0;

        // Determine if this was one of our seeds or a planner-related keyword
        const seedInfo = seedLookup.get(key);

        results.set(key, {
          keyword,
          category: (seedInfo?.category || 'direct') as any,
          source: (seedInfo?.source || 'planner_related') as any,
          avgMonthlySearches: avgSearches,
          lowCpc,
          highCpc,
          competition,
          jackpotScore: 0, // Calculated in step 6
          adScore: 0,
          seoScore: 0,
          relevance: seedInfo ? 4 : 3, // Seeds get higher base relevance
          opportunityType: 'quick_win', // Classified in step 6
        });
      }
    } catch (error: any) {
      functions.logger.warn(`Batch enrichment error: ${error.message}`);
      // Continue with remaining batches
    }
  }

  functions.logger.info(`Enriched: ${results.size} unique keywords from Keyword Planner`);
  return Array.from(results.values());
}

function mapCompetition(competition: any): CompetitionLevel {
  if (!competition) return 'UNSPECIFIED';
  const val = typeof competition === 'number' ? competition : competition.value || 0;
  switch (val) {
    case 2: return 'LOW';
    case 3: return 'MEDIUM';
    case 4: return 'HIGH';
    default: return 'UNSPECIFIED';
  }
}
