const fs = require('fs');

const data = JSON.parse(fs.readFileSync('keyword_results_combined.json', 'utf8'))
  .map(d => ({
    keyword: d.keyword,
    volume: d.avg_monthly_searches || 0,
    lowCpc: d.low_cpc || 0,
    highCpc: d.high_cpc || 0,
    avgCpc: ((d.low_cpc || 0) + (d.high_cpc || 0)) / 2,
    competition: d.competition || 'UNSPECIFIED',
  }));

// --- Scoring functions (matching our actual scoring.ts) ---
function volumeScore(v) {
  if (v <= 0) return 0;
  return Math.min(100, Math.round(Math.log10(v) * 30));
}
function cpcInverseScore(c) {
  if (c <= 0.01) return 100;
  if (c <= 0.50) return 90;
  if (c <= 1.00) return 70;
  if (c <= 3.00) return 50;
  if (c <= 5.00) return 40;
  if (c <= 10.00) return 20;
  if (c <= 50.00) return 5;
  return 0;
}
function compScore(c) {
  if (c === 'LOW') return 100;
  if (c === 'MEDIUM') return 50;
  if (c === 'HIGH') return 10;
  return 50;
}
function calcAdScore(kw) {
  const w = { volume: 0.30, cpcInverse: 0.25, competition: 0.20, relevance: 0.15, trend: 0.10 };
  const relevance = 3;
  return Math.round(Math.min(100, Math.max(0,
    volumeScore(kw.volume) * w.volume +
    cpcInverseScore(kw.avgCpc) * w.cpcInverse +
    compScore(kw.competition) * w.competition +
    (relevance * 20) * w.relevance +
    50 * w.trend
  )));
}

function percentileRank(arr, value) {
  return (arr.filter(v => v < value).length / arr.length) * 100;
}

// ============================================================
// STAGE 1: Current pipeline (baseline)
// ============================================================
const currentFiltered = data.filter(d => d.volume > 0); // current: just volume > 0
const currentScored = currentFiltered.map(d => ({ ...d, adScore: calcAdScore(d) }));
currentScored.sort((a, b) => b.adScore - a.adScore);
const currentTop1000 = currentScored.slice(0, 1000);

console.log('='.repeat(70));
console.log('BASELINE: Current pipeline (volume > 0, top 1000 by score)');
console.log('='.repeat(70));
console.log('After volume > 0 filter: ' + currentFiltered.length);
console.log('Top 1000 delivered to user');

// Stats on current top 1000
const curVolBuckets = {
  '10': currentTop1000.filter(d => d.volume === 10).length,
  '20-50': currentTop1000.filter(d => d.volume >= 20 && d.volume <= 50).length,
  '51-100': currentTop1000.filter(d => d.volume >= 51 && d.volume <= 100).length,
  '101-500': currentTop1000.filter(d => d.volume >= 101 && d.volume <= 500).length,
  '500+': currentTop1000.filter(d => d.volume > 500).length,
};
console.log('\nCurrent top 1000 volume breakdown:');
for (const [label, count] of Object.entries(curVolBuckets)) {
  console.log('  vol ' + label.padEnd(8) + ': ' + count);
}

const curCpcZero = currentTop1000.filter(d => d.avgCpc === 0).length;
const curScoreRange = { min: currentTop1000[999].adScore, max: currentTop1000[0].adScore };
console.log('\n$0 CPC in top 1000: ' + curCpcZero + ' (' + (curCpcZero/10).toFixed(1) + '%)');
console.log('Score range: ' + curScoreRange.min + ' - ' + curScoreRange.max);

// ============================================================
// STAGE 2: Volume >= 50 filter
// ============================================================
const vol50Filtered = data.filter(d => d.volume >= 50);
const vol50Scored = vol50Filtered.map(d => ({ ...d, adScore: calcAdScore(d) }));
vol50Scored.sort((a, b) => b.adScore - a.adScore);

console.log('\n' + '='.repeat(70));
console.log('STAGE 2: Volume >= 50 filter');
console.log('='.repeat(70));
console.log('After volume >= 50 filter: ' + vol50Filtered.length + ' (cut ' + (currentFiltered.length - vol50Filtered.length) + ')');

// ============================================================
// STAGE 3: Volume >= 50 + Moderate percentile CPC filter
// ============================================================
const cpcs = vol50Scored.map(d => d.avgCpc);
const vols = vol50Scored.map(d => d.volume);

const moderateFiltered = vol50Scored.filter(d => {
  const cpcR = percentileRank(cpcs, d.avgCpc);
  const volR = percentileRank(vols, d.volume);
  const shouldRemove = (cpcR > 50 && volR < 25) || (cpcR > 75 && volR < 50);
  return !shouldRemove;
});

console.log('\n' + '='.repeat(70));
console.log('STAGE 3: Volume >= 50 + Moderate percentile filter');
console.log('='.repeat(70));
console.log('After moderate filter: ' + moderateFiltered.length + ' (cut ' + (vol50Scored.length - moderateFiltered.length) + ' more)');

// Cap at 1000
const proposedTop1000 = moderateFiltered.slice(0, 1000);

console.log('Top 1000 delivered to user');

const propVolBuckets = {
  '50-100': proposedTop1000.filter(d => d.volume >= 50 && d.volume <= 100).length,
  '101-500': proposedTop1000.filter(d => d.volume >= 101 && d.volume <= 500).length,
  '501-1000': proposedTop1000.filter(d => d.volume >= 501 && d.volume <= 1000).length,
  '1001-5000': proposedTop1000.filter(d => d.volume >= 1001 && d.volume <= 5000).length,
  '5000+': proposedTop1000.filter(d => d.volume > 5000).length,
};
console.log('\nProposed top 1000 volume breakdown:');
for (const [label, count] of Object.entries(propVolBuckets)) {
  console.log('  vol ' + label.padEnd(10) + ': ' + count);
}

const propCpcZero = proposedTop1000.filter(d => d.avgCpc === 0).length;
const propScoreRange = { min: proposedTop1000[proposedTop1000.length - 1].adScore, max: proposedTop1000[0].adScore };
console.log('\n$0 CPC in top 1000: ' + propCpcZero + ' (' + (propCpcZero/10).toFixed(1) + '%)');
console.log('Score range: ' + propScoreRange.min + ' - ' + propScoreRange.max);

// ============================================================
// COMPARISON: What changed?
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('COMPARISON: Current vs Proposed');
console.log('='.repeat(70));

// Keywords in current top 1000 but NOT in proposed
const proposedSet = new Set(proposedTop1000.map(d => d.keyword));
const currentSet = new Set(currentTop1000.map(d => d.keyword));
const lostFromCurrent = currentTop1000.filter(d => !proposedSet.has(d.keyword));
const gainedInProposed = proposedTop1000.filter(d => !currentSet.has(d.keyword));

console.log('Keywords LOST from current top 1000: ' + lostFromCurrent.length);
console.log('Keywords GAINED in proposed top 1000: ' + gainedInProposed.length);
console.log('Keywords in BOTH: ' + (1000 - lostFromCurrent.length));

// What did we lose?
console.log('\n--- LOST keywords (were in current, not in proposed) - top 30: ---');
lostFromCurrent.sort((a, b) => b.adScore - a.adScore);
for (const kw of lostFromCurrent.slice(0, 30)) {
  console.log('  score:' + kw.adScore + ' "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition);
}

// What did we gain?
console.log('\n--- GAINED keywords (new in proposed, not in current) - top 30: ---');
gainedInProposed.sort((a, b) => b.adScore - a.adScore);
for (const kw of gainedInProposed.slice(0, 30)) {
  console.log('  score:' + kw.adScore + ' "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition);
}

// What did moderate percentile specifically cut?
const moderateCut = vol50Scored.filter(d => {
  const cpcR = percentileRank(cpcs, d.avgCpc);
  const volR = percentileRank(vols, d.volume);
  return (cpcR > 50 && volR < 25) || (cpcR > 75 && volR < 50);
});
console.log('\n--- Moderate percentile specifically cut (top 20 by CPC): ---');
moderateCut.sort((a, b) => b.avgCpc - a.avgCpc);
for (const kw of moderateCut.slice(0, 20)) {
  console.log('  score:' + kw.adScore + ' "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition);
}

// Pipeline impact
console.log('\n' + '='.repeat(70));
console.log('PIPELINE IMPACT');
console.log('='.repeat(70));
const currentBatches = Math.ceil(currentFiltered.length / 20);
const proposedPreFilter = vol50Filtered.length;
const proposedBatches = Math.ceil(proposedPreFilter / 20);
console.log('Current KP batches (all volume>0): ' + currentBatches + ' batches of 20');
console.log('Proposed KP batches (volume>=50):  ' + proposedBatches + ' batches of 20');
console.log('Batches saved: ' + (currentBatches - proposedBatches));
console.log('Est. time saved at 3 concurrent: ~' + Math.round((currentBatches - proposedBatches) / 3 * 2) + 's');
console.log('\nNote: If using HistoricalMetrics pre-filter, volume>=50 filter');
console.log('would apply BEFORE KeywordIdeas, cutting input from ~400 to ~' + Math.round(proposedPreFilter * 400 / currentFiltered.length));
