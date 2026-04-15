import type { KeywordResult, KeywordCluster } from '@jackpotkeywords/shared';
import { CATEGORY_LABELS, INTENT_LABELS } from '@jackpotkeywords/shared';

type AnyWorkbook = any;
type AnyWorksheet = any;

const HEADER_FILL = 'FF111827';
const HEADER_FONT = 'FFFFFFFF';

function addTitleRow(sheet: AnyWorksheet, text: string, colCount: number) {
  const row = sheet.addRow([text]);
  sheet.mergeCells(row.number, 1, row.number, colCount);
  row.height = 22;
  row.font = { bold: true, size: 14, color: { argb: HEADER_FONT } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  row.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function addHeaderRow(sheet: AnyWorksheet, headers: string[]) {
  const row = sheet.addRow(headers);
  row.height = 20;
  row.font = { bold: true, color: { argb: HEADER_FONT } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  row.alignment = { vertical: 'middle' };
}

function autoSize(sheet: AnyWorksheet, widths: number[]) {
  widths.forEach((w, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = w;
  });
}

function keywordRow(kw: KeywordResult, clusterName: string | undefined) {
  return [
    kw.keyword,
    CATEGORY_LABELS[kw.category] || kw.category,
    clusterName || '',
    kw.source,
    kw.intent ? INTENT_LABELS[kw.intent] : '',
    kw.aiRelevance ?? '',
    kw.avgMonthlySearches,
    kw.lowCpc,
    kw.highCpc,
    kw.competition,
    kw.jackpotScore,
    kw.adScore,
    kw.seoScore,
    kw.trendDirection || '',
    kw.trendInfo || '',
  ];
}

const KEYWORD_HEADERS = [
  'Keyword', 'Category', 'Cluster', 'Source', 'Intent', 'Relevance',
  'Avg Monthly Searches', 'Low CPC', 'High CPC', 'Competition',
  'Jackpot Score', 'Ad Score', 'SEO Score', 'Trend', 'Trend Info',
];

export async function exportKeywordsXlsx(
  keywords: KeywordResult[],
  clusters: KeywordCluster[] | undefined,
  productLabel: string,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default as any;
  const wb: AnyWorkbook = new ExcelJS.Workbook();
  wb.creator = 'JackpotKeywords';
  wb.created = new Date();
  wb.properties = { title: `${productLabel} keywords` };

  const clusterMap = new Map<string, string>();
  if (clusters) {
    for (const c of clusters) {
      for (const k of c.keywordKeys) clusterMap.set(k, c.name);
    }
  }

  // ----- Sheet 1: Summary -----
  const summary = wb.addWorksheet('Summary');
  addTitleRow(summary, `Keyword Research — ${productLabel}`, 4);
  summary.addRow([]);
  const totalVol = keywords.reduce((s, k) => s + (k.avgMonthlySearches || 0), 0);
  const avgCpc = keywords.length
    ? keywords.reduce((s, k) => s + (k.lowCpc + k.highCpc) / 2, 0) / keywords.length
    : 0;
  const jackpots = keywords.filter((k) => k.jackpotScore >= 75).length;
  const goldmines = keywords.filter((k) => k.lowCpc < 1 && k.avgMonthlySearches >= 100).length;

  addHeaderRow(summary, ['Metric', 'Value', '', '']);
  summary.addRow(['Total keywords', keywords.length]);
  summary.addRow(['Total monthly volume', totalVol]);
  summary.addRow(['Average CPC', avgCpc]);
  summary.addRow(['Jackpot keywords (score ≥ 75)', jackpots]);
  summary.addRow(['Goldmines (< $1 CPC, 100+ volume)', goldmines]);
  summary.addRow(['Clusters', clusters?.length || 0]);
  summary.getColumn(3).numFmt = '0';
  summary.getCell(`B${summary.rowCount - 3}`).numFmt = '"$"#,##0.00';
  autoSize(summary, [36, 20, 4, 4]);

  summary.addRow([]);
  addTitleRow(summary, 'Top 10 Opportunities (by Jackpot Score)', 4);
  summary.addRow([]);
  addHeaderRow(summary, ['Keyword', 'Score', 'Volume', 'CPC (avg)']);
  const top10 = [...keywords].sort((a, b) => b.jackpotScore - a.jackpotScore).slice(0, 10);
  for (const kw of top10) {
    const r = summary.addRow([kw.keyword, kw.jackpotScore, kw.avgMonthlySearches, (kw.lowCpc + kw.highCpc) / 2]);
    r.getCell(4).numFmt = '"$"#,##0.00';
  }

  // ----- Sheet 2: All Keywords -----
  const all = wb.addWorksheet('All Keywords');
  addHeaderRow(all, KEYWORD_HEADERS);
  for (const kw of keywords) {
    all.addRow(keywordRow(kw, clusterMap.get(kw.keyword)));
  }
  all.getColumn(8).numFmt = '"$"#,##0.00'; // Low CPC
  all.getColumn(9).numFmt = '"$"#,##0.00'; // High CPC
  all.getColumn(7).numFmt = '#,##0'; // Volume
  all.getColumn(11).numFmt = '0'; // Jackpot
  all.getColumn(12).numFmt = '0'; // Ad
  all.getColumn(13).numFmt = '0'; // SEO
  autoSize(all, [36, 16, 18, 10, 14, 10, 14, 10, 10, 14, 10, 10, 10, 12, 30]);

  // Conditional formatting on Jackpot Score column (K)
  all.addConditionalFormatting({
    ref: `K2:K${keywords.length + 1}`,
    rules: [
      { type: 'cellIs', operator: 'greaterThanOrEqual', formulae: ['75'], style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF86EFAC' } }, font: { color: { argb: 'FF065F46' }, bold: true } }, priority: 1 },
      { type: 'cellIs', operator: 'between', formulae: ['50', '74'], style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, font: { color: { argb: 'FF92400E' } } }, priority: 2 },
      { type: 'cellIs', operator: 'lessThan', formulae: ['50'], style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }, font: { color: { argb: 'FF6B7280' } } }, priority: 3 },
    ],
  });
  all.autoFilter = { from: { row: 1, column: 1 }, to: { row: keywords.length + 1, column: KEYWORD_HEADERS.length } };
  all.views = [{ state: 'frozen', ySplit: 1 }];

  // ----- Sheet 3: By Category -----
  const byCat = wb.addWorksheet('By Category');
  const categoryGroups = new Map<string, KeywordResult[]>();
  for (const kw of keywords) {
    const label = CATEGORY_LABELS[kw.category] || kw.category;
    if (!categoryGroups.has(label)) categoryGroups.set(label, []);
    categoryGroups.get(label)!.push(kw);
  }
  addHeaderRow(byCat, ['Category', 'Count', 'Avg Volume', 'Avg CPC', 'Avg Jackpot Score']);
  const catRows = Array.from(categoryGroups.entries()).sort((a, b) => b[1].length - a[1].length);
  for (const [cat, list] of catRows) {
    const avgVol = list.reduce((s, k) => s + (k.avgMonthlySearches || 0), 0) / list.length;
    const avgCpcCat = list.reduce((s, k) => s + (k.lowCpc + k.highCpc) / 2, 0) / list.length;
    const avgJp = list.reduce((s, k) => s + (k.jackpotScore || 0), 0) / list.length;
    const r = byCat.addRow([cat, list.length, Math.round(avgVol), avgCpcCat, Math.round(avgJp)]);
    r.getCell(4).numFmt = '"$"#,##0.00';
  }
  autoSize(byCat, [28, 12, 16, 14, 18]);

  // ----- Sheet 4: By Cluster -----
  if (clusters && clusters.length > 0) {
    const byCluster = wb.addWorksheet('By Cluster');
    addHeaderRow(byCluster, ['Cluster', 'Keywords', 'Total Volume', 'Avg CPC']);
    for (const c of clusters) {
      const clusterKeywords = keywords.filter((k) => c.keywordKeys.includes(k.keyword));
      const vol = clusterKeywords.reduce((s, k) => s + (k.avgMonthlySearches || 0), 0);
      const cpc = clusterKeywords.length
        ? clusterKeywords.reduce((s, k) => s + (k.lowCpc + k.highCpc) / 2, 0) / clusterKeywords.length
        : 0;
      const r = byCluster.addRow([c.name, clusterKeywords.length, vol, cpc]);
      r.getCell(4).numFmt = '"$"#,##0.00';
      r.getCell(3).numFmt = '#,##0';
    }
    autoSize(byCluster, [40, 12, 16, 14]);
  }

  // ----- Sheet 5: Google Ads Editor -----
  const gaSheet = wb.addWorksheet('Google Ads Editor');
  addHeaderRow(gaSheet, ['Campaign', 'Ad group', 'Keyword', 'Criterion Type', 'Status', 'Max CPC', 'Labels']);
  for (const kw of keywords) {
    const adGroup = CATEGORY_LABELS[kw.category] || kw.category;
    const maxCpc = kw.lowCpc > 0 ? kw.lowCpc : '';
    const labels = `JackpotScore:${kw.jackpotScore}${kw.intent ? ';Intent:' + kw.intent : ''}${kw.aiRelevance ? ';Rel:' + kw.aiRelevance : ''}`;
    const r = gaSheet.addRow([productLabel, adGroup, kw.keyword, 'Broad', 'paused', maxCpc, labels]);
    if (typeof maxCpc === 'number') r.getCell(6).numFmt = '"$"#,##0.00';
  }
  autoSize(gaSheet, [24, 20, 36, 14, 10, 12, 48]);

  // ----- Download -----
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${productLabel.replace(/\s+/g, '-').toLowerCase()}-keywords.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
