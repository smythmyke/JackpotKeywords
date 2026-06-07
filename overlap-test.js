const fs = require('fs');
const path = require('path');

// Load the full KP dataset
const data = JSON.parse(fs.readFileSync('keyword_results_combined.json', 'utf8'))
  .filter(d => d.avg_monthly_searches > 0)
  .map(d => ({
    keyword: d.keyword,
    volume: d.avg_monthly_searches || 0,
    avgCpc: ((d.low_cpc || 0) + (d.high_cpc || 0)) / 2,
    competition: d.competition || 'UNSPECIFIED',
  }));

// Simulate seed keywords — these would come from Gemini + autocomplete for "keyword research tool"
// Using the most common meaningful words that would appear in seeds for this product
const seedWords = new Set([
  // Direct seeds
  'keyword', 'keywords', 'research', 'tool', 'seo', 'search',
  // Feature seeds
  'volume', 'cpc', 'competition', 'ranking', 'rank', 'tracking', 'analysis',
  'planner', 'finder', 'generator', 'checker', 'analyzer', 'explorer',
  // Competitor seeds
  'semrush', 'ahrefs', 'ubersuggest', 'moz', 'spyfu', 'mangools',
  'longtailpro', 'keywordtool', 'kwfinder',
  // Problem seeds
  'profitable', 'organic', 'traffic', 'backlink', 'backlinks',
  // Audience seeds
  'blogger', 'marketer', 'ecommerce', 'shopify', 'etsy', 'amazon', 'youtube',
  // Adjacent
  'content', 'optimization', 'audit', 'serp', 'domain', 'authority',
  'ppc', 'ads', 'advertising', 'campaign',
]);

// Generic words to exclude (same as in the actual codebase)
const GENERIC_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'your', 'that', 'this', 'what', 'how',
  'can', 'does', 'will', 'are', 'not', 'get', 'use', 'make', 'way', 'one',
  'tool', 'tools', 'app', 'apps', 'software', 'platform', 'service', 'services',
  'chrome', 'extension', 'plugin', 'website', 'site', 'web',
  'best', 'free', 'top', 'good', 'great', 'easy', 'simple', 'fast', 'quick',
  'new', 'online', 'help', 'tips', 'guide', 'review', 'reviews',
  'buy', 'shop', 'store', 'cost', 'price', 'pricing', 'plan', 'plans',
  'sale', 'deal', 'deals', 'order', 'pay', 'money',
  'create', 'start', 'learn', 'find', 'search', 'look', 'need', 'want',
  'work', 'works', 'using', 'used',
  'like', 'just', 'also', 'more', 'most', 'very', 'really', 'about',
  'meaning', 'mean', 'means', 'definition',
]);

function countMeaningfulOverlap(keyword) {
  const words = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !GENERIC_WORDS.has(w));
  return words.filter(w => seedWords.has(w)).length;
}

// Categorize all keywords by overlap count
const byOverlap = { 0: [], 1: [], 2: [], 3: [] };
for (const kw of data) {
  const overlap = countMeaningfulOverlap(kw.keyword);
  const bucket = Math.min(overlap, 3);
  byOverlap[bucket].push(kw);
}

console.log('='.repeat(70));
console.log('WORD OVERLAP ANALYSIS — ' + data.length + ' keywords');
console.log('='.repeat(70));

console.log('\nOverlap distribution:');
console.log('  0 meaningful words: ' + byOverlap[0].length + ' (' + (byOverlap[0].length/data.length*100).toFixed(1) + '%)');
console.log('  1 meaningful word:  ' + byOverlap[1].length + ' (' + (byOverlap[1].length/data.length*100).toFixed(1) + '%)');
console.log('  2 meaningful words: ' + byOverlap[2].length + ' (' + (byOverlap[2].length/data.length*100).toFixed(1) + '%)');
console.log('  3+ meaningful words: ' + byOverlap[3].length + ' (' + (byOverlap[3].length/data.length*100).toFixed(1) + '%)');

// If we require 2+ overlap, we'd remove 0-overlap and 1-overlap keywords
// But 0-overlap are already removed by current filter. So the NEW removals are 1-overlap.
const currentlyKept = [...byOverlap[1], ...byOverlap[2], ...byOverlap[3]];
const newlyRemoved = byOverlap[1]; // keywords with exactly 1 word overlap

console.log('\nCurrent filter (1+ overlap) keeps: ' + currentlyKept.length);
console.log('Proposed filter (2+ overlap) would remove: ' + newlyRemoved.length + ' (' + (newlyRemoved.length/currentlyKept.length*100).toFixed(1) + '% of currently kept)');

// Analyze what we'd lose
const highValueRemoved = newlyRemoved
  .filter(kw => kw.volume >= 100 && kw.avgCpc > 0)
  .sort((a, b) => (b.volume * (1/(b.avgCpc+1))) - (a.volume * (1/(a.avgCpc+1))));

const highVolumeRemoved = newlyRemoved
  .filter(kw => kw.volume >= 500)
  .sort((a, b) => b.volume - a.volume);

console.log('\n--- WOULD LOSE: High value (vol>=100 AND CPC>$0), top 25 by volume/CPC ratio: ---');
for (const kw of highValueRemoved.slice(0, 25)) {
  console.log('  "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition + ' overlap:1');
}

console.log('\n--- WOULD LOSE: High volume (vol>=500), top 25: ---');
for (const kw of highVolumeRemoved.slice(0, 25)) {
  console.log('  "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition);
}

console.log('\n--- WOULD LOSE: $0 CPC but high volume (vol>=1000): ---');
const zeroHighVol = newlyRemoved.filter(kw => kw.avgCpc === 0 && kw.volume >= 1000).sort((a,b) => b.volume - a.volume);
for (const kw of zeroHighVol.slice(0, 15)) {
  console.log('  "' + kw.keyword + '" vol:' + kw.volume + ' comp:' + kw.competition);
}

// Low-value noise that 2-word filter correctly removes
console.log('\n--- CORRECTLY REMOVES: Low volume (vol<=50) with 1-word overlap, sample: ---');
const noise = newlyRemoved.filter(kw => kw.volume <= 50).sort((a,b) => b.avgCpc - a.avgCpc);
console.log('  Count: ' + noise.length + ' keywords');
for (const kw of noise.slice(0, 15)) {
  console.log('  "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition);
}

// Summary stats
const removedAvgVol = newlyRemoved.reduce((s, k) => s + k.volume, 0) / newlyRemoved.length;
const keptAvgVol = [...byOverlap[2], ...byOverlap[3]].reduce((s, k) => s + k.volume, 0) / (byOverlap[2].length + byOverlap[3].length);
console.log('\n--- SUMMARY ---');
console.log('Avg volume of REMOVED (1-overlap): ' + Math.round(removedAvgVol));
console.log('Avg volume of KEPT (2+ overlap): ' + Math.round(keptAvgVol));
console.log('KP batches saved: ~' + Math.round(newlyRemoved.length / 20) + ' fewer batches (at 20/batch)');
console.log('Est. time saved: ~' + Math.round(newlyRemoved.length / 20 / 3 * 2) + 's (at 3 concurrent, ~2s each)');
