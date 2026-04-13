import { google } from 'googleapis';
import * as functions from 'firebase-functions';

const CLIENT_ID = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN || '';
const SITE_URL = 'https://jackpotkeywords.web.app';

function getClient() {
  if (!REFRESH_TOKEN) {
    throw new Error('GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN not configured');
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return google.webmasters({ version: 'v3', auth: oauth2Client });
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsResult {
  rows: SearchAnalyticsRow[];
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

export async function getSearchAnalytics(
  startDate: string,
  endDate: string,
  dimensions: string[] = ['query'],
  rowLimit = 100,
): Promise<SearchAnalyticsResult> {
  const client = getClient();

  try {
    const response = await client.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions,
        rowLimit,
      },
    });

    const rows: SearchAnalyticsRow[] = (response.data.rows || []).map((row: any) => ({
      keys: row.keys || [],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    const totals = rows.reduce(
      (acc, row) => ({
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
        ctr: 0, // computed below
        position: acc.position + row.position * row.impressions, // weighted
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    );

    if (totals.impressions > 0) {
      totals.ctr = totals.clicks / totals.impressions;
      totals.position = totals.position / totals.impressions;
    }

    return { rows, totals };
  } catch (err: any) {
    functions.logger.error('Search Console API error:', err.message);
    throw new Error(`Search Console query failed: ${err.message}`);
  }
}
