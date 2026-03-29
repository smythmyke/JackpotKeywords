import * as functions from 'firebase-functions';
import type { KeywordResult } from '@jackpotkeywords/shared';

/**
 * Step 5: Google Trends overlay
 *
 * Trend data is now calculated directly from Keyword Planner's
 * monthly_search_volumes in step 4, so this is a passthrough.
 * Kept as a pipeline step for future enhancement (e.g. SerpAPI integration).
 */
export async function overlayTrends(
  keywords: KeywordResult[],
): Promise<KeywordResult[]> {
  const withTrends = keywords.filter((k) => k.trendDirection);
  functions.logger.info(`Trends overlay: ${withTrends.length} keywords already have trend data from KP`);
  return keywords;
}
