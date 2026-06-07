/**
 * Contamination repro for the recommend pipeline (task: recommend contamination bug).
 *
 * Runs the EXACT stages of runRecommendPipeline (non-deep) for a description-only
 * input, dumping every stage to research/contamination-debug/ and tracing where
 * off-topic keywords first enter (seed gen vs autocomplete vs KP expansion).
 *
 * Usage: node scripts/debug-contamination.mjs ["product description"]
 * Default description = the original repro: "AI meeting-notes app"
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FN = path.join(ROOT, 'packages', 'functions');
const OUT = path.join(ROOT, 'research', 'contamination-debug');
mkdirSync(OUT, { recursive: true });

// Load packages/functions/.env into process.env (no dotenv dep needed)
for (const line of readFileSync(path.join(FN, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const require = createRequire(path.join(FN, 'package.json'));
const { extractProductContext, generateSeeds, scoreAndClassify } = require('./lib/services/gemini.js');
const { expandAutocomplete } = require('./lib/services/autocomplete.js');
const { enrichKeywords } = require('./lib/services/keywordPlanner.js');
const { overlayTrends } = require('./lib/services/googleTrends.js');
const { inferCategory } = require('./lib/services/categoryInference.js');

const description = process.argv[2] || 'AI meeting-notes app';
const save = (name, data) => writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));

console.log(`=== Repro: "${description}" ===\n`);

// Step 0: context
const context = await extractProductContext(description, undefined, undefined);
save('0-context.json', context);
console.log(`[0] context: label="${context.productLabel}" name="${context.productName}"`);

// Step 1: AI seeds
const seeds = await generateSeeds(context, undefined);
save('1-seeds.json', seeds);
console.log(`[1] seeds: ${seeds.allSeeds.length} AI seeds, topSeeds=${JSON.stringify(seeds.topSeeds)}`);

// Step 2: autocomplete (non-deep path)
const autocompleteKeywords = await expandAutocomplete(seeds.topSeeds);
save('2-autocomplete.json', autocompleteKeywords);
console.log(`[2] autocomplete: ${autocompleteKeywords.length} keywords`);

// Step 3: merge & dedupe — verbatim from recommendPipeline.ts
const sourceCounts = new Map();
const seen = new Set();
const masterList = [];
for (const seed of seeds.allSeeds) {
  const key = seed.keyword.toLowerCase().trim();
  const set = sourceCounts.get(key) ?? new Set();
  set.add(seed.source);
  sourceCounts.set(key, set);
  if (!seen.has(key)) { seen.add(key); masterList.push(seed); }
}
for (const kw of autocompleteKeywords) {
  const key = kw.keyword.toLowerCase().trim();
  const set = sourceCounts.get(key) ?? new Set();
  set.add(kw.source);
  sourceCounts.set(key, set);
  if (!seen.has(key)) { seen.add(key); masterList.push({ ...kw, category: inferCategory(kw.keyword) }); }
}
save('3-masterlist.json', masterList);
console.log(`[3] masterList: ${masterList.length} keywords sent to KP`);

// Step 4: KP enrichment
const enriched = await enrichKeywords(masterList);
save('4-enriched.json', enriched);
const kpRelated = enriched.filter((k) => k.source === 'planner_related');
console.log(`[4] enriched: ${enriched.length} total, ${kpRelated.length} planner_related added by KP`);
for (const kw of enriched) {
  const key = kw.keyword.toLowerCase().trim();
  if (kw.source) {
    const set = sourceCounts.get(key) ?? new Set();
    set.add(kw.source);
    sourceCounts.set(key, set);
  }
}
let maxPlatforms = 1;
for (const set of sourceCounts.values()) if (set.size > maxPlatforms) maxPlatforms = set.size;

// Step 5+6: trends + scoring (inlineRelevance mirrors the recommend surface)
const withTrends = await overlayTrends(enriched);
const scored = await scoreAndClassify(withTrends, context, undefined, { sourceCounts, maxPlatforms, inlineRelevance: true });

// Mirror recommendPipeline's relevance cutoff filter
const RELEVANCE_CUTOFF = 3;
const dropped = scored.keywords.filter((kw) => kw.aiRelevance !== undefined && kw.aiRelevance <= RELEVANCE_CUTOFF);
scored.keywords = scored.keywords.filter((kw) => kw.aiRelevance === undefined || kw.aiRelevance > RELEVANCE_CUTOFF);
save('6-dropped-irrelevant.json', dropped.map((k) => ({ keyword: k.keyword, aiRelevance: k.aiRelevance, source: k.source })));
console.log(`[6] relevance filter: dropped ${dropped.length} keywords with aiRelevance <= ${RELEVANCE_CUTOFF}`);

scored.keywords.sort((a, b) => (b.jackpotScore_v2 ?? b.jackpotScore) - (a.jackpotScore_v2 ?? a.jackpotScore));
save('5-scored.json', scored.keywords);

// ---- Analysis ----
const masterSet = new Set(masterList.map((s) => s.keyword.toLowerCase().trim()));
const acByKey = new Map(autocompleteKeywords.map((k) => [k.keyword.toLowerCase().trim(), k]));
const top50 = scored.keywords.slice(0, 50);

console.log('\n=== TOP 50 by jackpotScore_v2 ===');
console.log('rank  v2  rel  vol      cpc(lo-hi)   comp    source             keyword  [entry trace]');
top50.forEach((kw, i) => {
  const key = kw.keyword.toLowerCase().trim();
  let trace;
  if (kw.source === 'ai') trace = 'AI seed';
  else if (acByKey.has(key)) trace = `autocomplete<-"${acByKey.get(key).parentSeed || '?'}"`;
  else if (!masterSet.has(key)) trace = 'KP planner_related';
  else trace = kw.source;
  const cpc = `$${kw.lowCpc.toFixed(2)}-$${kw.highCpc.toFixed(2)}`;
  console.log(
    `${String(i + 1).padStart(3)}  ${String(kw.jackpotScore_v2).padStart(3)}  ${String(kw.aiRelevance ?? '-').padStart(3)}  ${String(kw.avgMonthlySearches).padStart(7)}  ${cpc.padStart(13)}  ${(kw.competition || '?').padEnd(6)}  ${String(kw.source).padEnd(17)}  ${kw.keyword}  [${trace}]`,
  );
});

// Zero-CPC stats
const zeroCpc = scored.keywords.filter((k) => k.lowCpc === 0 && k.highCpc === 0);
console.log(`\nZero-CPC rows: ${zeroCpc.length}/${scored.keywords.length} total, ${top50.filter((k) => k.lowCpc === 0 && k.highCpc === 0).length}/50 in top 50`);

console.log(`\nDumps written to ${OUT}`);
