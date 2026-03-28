import * as functions from 'firebase-functions';
import type { KeywordResult, TrendDirection } from '@jackpotkeywords/shared';

// Using google-trends-api npm package
const googleTrends = require('google-trends-api');

/**
 * Step 5: Overlay Google Trends data on top keywords
 * Only processes top 100 keywords by volume to stay within rate limits
 */
export async function overlayTrends(
  keywords: KeywordResult[],
): Promise<KeywordResult[]> {
  // Sort by volume, take top 100
  const sorted = [...keywords].sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches);
  const topKeywords = sorted.slice(0, 100);
  const trendMap = new Map<string, { direction: TrendDirection; info: string }>();

  // Process in small batches to avoid rate limiting
  const BATCH_SIZE = 5;
  for (let i = 0; i < topKeywords.length; i += BATCH_SIZE) {
    const batch = topKeywords.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (kw) => {
      try {
        const result = await googleTrends.interestOverTime({
          keyword: kw.keyword,
          startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
          geo: 'US',
        });

        const data = JSON.parse(result);
        const timeline = data.default?.timelineData || [];

        if (timeline.length >= 2) {
          const trend = analyzeTrend(timeline);
          trendMap.set(kw.keyword.toLowerCase(), trend);
        }
      } catch {
        // Skip on rate limit or error
      }
    });

    await Promise.all(promises);

    // Delay between batches
    if (i + BATCH_SIZE < topKeywords.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  functions.logger.info(`Trends overlay: ${trendMap.size} keywords with trend data`);

  // Apply trend data to all keywords
  return keywords.map((kw) => {
    const trend = trendMap.get(kw.keyword.toLowerCase());
    if (trend) {
      return {
        ...kw,
        trendDirection: trend.direction,
        trendInfo: trend.info,
      };
    }
    return kw;
  });
}

function analyzeTrend(
  timeline: { value: number[] }[],
): { direction: TrendDirection; info: string } {
  const values = timeline.map((t) => t.value[0] || 0);
  if (values.length < 4) return { direction: 'stable', info: 'Insufficient data' };

  // Compare first quarter avg to last quarter avg
  const quarterSize = Math.floor(values.length / 4);
  const firstQuarter = values.slice(0, quarterSize);
  const lastQuarter = values.slice(-quarterSize);

  const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
  const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;

  if (firstAvg === 0) return { direction: 'stable', info: 'Low data' };

  const changePercent = ((lastAvg - firstAvg) / firstAvg) * 100;

  let direction: TrendDirection;
  let info: string;

  if (changePercent > 30) {
    direction = 'rising';
    info = `Rising ${Math.round(changePercent)}% YoY`;
  } else if (changePercent > 10) {
    direction = 'rising_slight';
    info = `Up ${Math.round(changePercent)}% YoY`;
  } else if (changePercent > -10) {
    direction = 'stable';
    info = 'Stable';
  } else if (changePercent > -30) {
    direction = 'declining_slight';
    info = `Down ${Math.round(Math.abs(changePercent))}% YoY`;
  } else {
    direction = 'declining';
    info = `Declining ${Math.round(Math.abs(changePercent))}% YoY`;
  }

  // Check for seasonality (high variance)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / mean;

  if (cv > 0.4) {
    // Find peak month
    const maxIdx = values.indexOf(Math.max(...values));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const peakWeek = timeline[maxIdx];
    info += ` (Seasonal)`;
  }

  return { direction, info };
}
