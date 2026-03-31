import type { KeywordResult, KeywordCluster } from '@jackpotkeywords/shared';
import { CATEGORY_LABELS, INTENT_LABELS } from '@jackpotkeywords/shared';

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export keyword data as an analysis CSV
 */
export function exportAnalysisCsv(keywords: KeywordResult[], productLabel: string, clusters?: KeywordCluster[]) {
  // Build keyword-to-cluster lookup
  const clusterMap = new Map<string, string>();
  if (clusters) {
    for (const c of clusters) {
      for (const k of c.keywordKeys) {
        clusterMap.set(k, c.name);
      }
    }
  }

  const headers = [
    'Keyword',
    'Category',
    ...(clusters ? ['Cluster'] : []),
    'Source',
    'Intent',
    'Avg Monthly Searches',
    'Low CPC',
    'High CPC',
    'Competition',
    'Jackpot Score',
    'Ad Score',
    'SEO Score',
    'Trend',
    'Trend Info',
  ];

  const rows = keywords.map((kw) => [
    escapeCsv(kw.keyword),
    escapeCsv(CATEGORY_LABELS[kw.category] || kw.category),
    ...(clusters ? [escapeCsv(clusterMap.get(kw.keyword) || '')] : []),
    kw.source,
    kw.intent ? INTENT_LABELS[kw.intent] : '',
    String(kw.avgMonthlySearches),
    kw.lowCpc.toFixed(2),
    kw.highCpc.toFixed(2),
    kw.competition,
    String(kw.jackpotScore),
    String(kw.adScore),
    String(kw.seoScore),
    kw.trendDirection || '',
    escapeCsv(kw.trendInfo || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filename = `${productLabel.replace(/\s+/g, '-').toLowerCase()}-keywords.csv`;
  downloadCsv(filename, csv);
}

/**
 * Export keywords in Google Ads Editor-compatible CSV format
 */
export function exportGoogleAdsCsv(keywords: KeywordResult[], productLabel: string) {
  const headers = [
    'Campaign',
    'Ad group',
    'Keyword',
    'Criterion Type',
    'Status',
    'Max CPC',
    'Labels',
  ];

  const campaignName = productLabel;

  const rows = keywords.map((kw) => {
    const adGroup = CATEGORY_LABELS[kw.category] || kw.category;
    // Use low CPC as starting bid, minimum $0.01
    const maxCpc = kw.lowCpc > 0 ? kw.lowCpc.toFixed(2) : '';

    return [
      escapeCsv(campaignName),
      escapeCsv(adGroup),
      escapeCsv(kw.keyword),
      'Broad',
      'paused',
      maxCpc,
      `JackpotScore:${kw.jackpotScore}${kw.intent ? ';Intent:' + kw.intent : ''}`,
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filename = `${productLabel.replace(/\s+/g, '-').toLowerCase()}-google-ads.csv`;
  downloadCsv(filename, csv);
}
