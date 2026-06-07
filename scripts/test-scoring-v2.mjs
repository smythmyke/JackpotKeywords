// Phase 0 smoke test — exercise compiled v2 scoring with representative inputs.
// Confirms formula returns sensible values across the v1/v2 weight shift.

import {
  calculateAdScore,
  calculateJackpotScoreV2,
  gkpCompositeScore,
  suggestDepthScore,
  clusterFitScore,
  aiRelevanceScore,
  percentile,
} from '../packages/shared/dist/index.js';

const cases = [
  {
    label: 'High-volume cheap CPC, LOW comp, multi-platform, in big cluster, high relevance',
    input: {
      volume: 50000, lowCpc: 0.5, highCpc: 1.0, competition: 'LOW',
      trend: 'rising', suggestHits: 5, maxPlatforms: 6,
      cluster: { totalVolume: 200000, keywordCount: 25 }, clusterVolumeP90: 250000,
      aiRelevance: 9,
    },
  },
  {
    label: 'Same keyword, NO aiRelevance, NO cluster (pass-1 view)',
    input: {
      volume: 50000, lowCpc: 0.5, highCpc: 1.0, competition: 'LOW',
      trend: 'rising', suggestHits: 5, maxPlatforms: 6,
      aiRelevance: undefined,
    },
  },
  {
    label: 'High-volume but expensive + HIGH comp + single platform (typical brand term)',
    input: {
      volume: 100000, lowCpc: 8, highCpc: 15, competition: 'HIGH',
      trend: 'stable', suggestHits: 1, maxPlatforms: 6,
      cluster: { totalVolume: 100000, keywordCount: 5 }, clusterVolumeP90: 200000,
      aiRelevance: 4,
    },
  },
  {
    label: 'AI-only seed, never surfaced by KP or autocomplete (suggestHits=1, low relevance)',
    input: {
      volume: 200, lowCpc: 0.3, highCpc: 0.6, competition: 'LOW',
      suggestHits: 1, maxPlatforms: 2,
      aiRelevance: 3,
    },
  },
  {
    label: 'Goldilocks: mid volume, mid CPC, MEDIUM, multi-platform, dense cluster, high relevance',
    input: {
      volume: 2000, lowCpc: 2, highCpc: 4, competition: 'MEDIUM',
      trend: 'rising_slight', suggestHits: 3, maxPlatforms: 4,
      cluster: { totalVolume: 50000, keywordCount: 15 }, clusterVolumeP90: 80000,
      aiRelevance: 8,
    },
  },
];

console.log('=== Scoring v2 smoke test ===\n');

for (const c of cases) {
  const i = c.input;
  const avgCpc = (i.lowCpc + i.highCpc) / 2;
  const v1 = calculateAdScore(i.volume, i.lowCpc, i.highCpc, i.competition, 4, i.trend);
  const v2 = calculateJackpotScoreV2(i);
  const gkp = gkpCompositeScore(i.volume, avgCpc, i.competition);
  const ai = aiRelevanceScore(i.aiRelevance);
  const depth = suggestDepthScore(i.suggestHits ?? 1, i.maxPlatforms ?? 1);
  const fit = i.cluster && i.clusterVolumeP90 !== undefined
    ? clusterFitScore(i.cluster, i.clusterVolumeP90)
    : 50;
  console.log(c.label);
  console.log(`  v1=${v1}  v2=${v2}  Δ=${v2 - v1}`);
  console.log(`  inputs: gkp=${gkp} ai=${ai} depth=${depth} fit=${fit}`);
  console.log('');
}

// Percentile sanity
const sample = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
console.log('percentile([10..100], 0.9) =', percentile(sample, 0.9), '(should be 90 or 100)');
console.log('percentile([], 0.9) =', percentile([], 0.9), '(should be 0)');

// Range sanity — random brute
let minV2 = 100, maxV2 = 0;
for (let n = 0; n < 5000; n++) {
  const v = calculateJackpotScoreV2({
    volume: Math.random() * 100000,
    lowCpc: Math.random() * 20,
    highCpc: Math.random() * 30,
    competition: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
    suggestHits: Math.ceil(Math.random() * 6),
    maxPlatforms: 6,
    aiRelevance: Math.random() * 10,
  });
  if (v < minV2) minV2 = v;
  if (v > maxV2) maxV2 = v;
  if (v < 0 || v > 100 || !Number.isFinite(v)) {
    console.error('OUT-OF-RANGE v2:', v);
    process.exit(1);
  }
}
console.log(`\n5000 random samples: v2 ranged [${minV2}, ${maxV2}] — all in [0, 100] ✓`);
