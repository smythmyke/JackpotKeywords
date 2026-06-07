const fs = require('fs');
const path = require('path');

const home = process.env.USERPROFILE || process.env.HOME;
const files = [
  { name: 'AI Keyword Research Tool', path: path.join(home, 'Downloads', 'ai-keyword-research-tool-keywords.csv') },
  { name: 'Digital Products Side Hustlers', path: path.join(home, 'Downloads', 'digital-products-for-side-hustlers-keywords.csv') },
  { name: 'OBS Studio Companion', path: path.join(home, 'Downloads', 'obs-studio-companion-tool-keywords.csv') },
];

function parseCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const volIdx = header.indexOf('Avg Monthly Searches');
  const lowCpcIdx = header.indexOf('Low CPC');
  const highCpcIdx = header.indexOf('High CPC');
  const compIdx = header.indexOf('Competition');
  const kwIdx = header.indexOf('Keyword');
  const scoreIdx = header.indexOf('Jackpot Score');

  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      keyword: cols[kwIdx],
      volume: parseInt(cols[volIdx]) || 0,
      lowCpc: parseFloat(cols[lowCpcIdx]) || 0,
      highCpc: parseFloat(cols[highCpcIdx]) || 0,
      avgCpc: ((parseFloat(cols[lowCpcIdx]) || 0) + (parseFloat(cols[highCpcIdx]) || 0)) / 2,
      competition: cols[compIdx],
      score: parseInt(cols[scoreIdx]) || 0,
    };
  });
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function percentileRank(arr, value) {
  const below = arr.filter(v => v < value).length;
  return (below / arr.length) * 100;
}

for (const file of files) {
  const data = parseCSV(file.path);
  const cpcs = data.map(d => d.avgCpc);
  const vols = data.map(d => d.volume);

  const cpcP25 = percentile(cpcs, 0.25);
  const cpcP50 = percentile(cpcs, 0.50);
  const cpcP75 = percentile(cpcs, 0.75);
  const cpcMax = Math.max(...cpcs);
  const cpcMin = Math.min(...cpcs);
  const cpcMean = cpcs.reduce((a, b) => a + b, 0) / cpcs.length;
  const zeroCpc = cpcs.filter(c => c === 0).length;

  const volP25 = percentile(vols, 0.25);
  const volP50 = percentile(vols, 0.50);
  const volP75 = percentile(vols, 0.75);
  const volMax = Math.max(...vols);
  const volMin = Math.min(...vols);
  const zeroVol = vols.filter(v => v === 0).length;

  console.log('');
  console.log('='.repeat(70));
  console.log('DATASET: ' + file.name + ' (' + data.length + ' keywords)');
  console.log('='.repeat(70));

  console.log('\nCPC Distribution:');
  console.log('  Min: $' + cpcMin.toFixed(2) + ' | P25: $' + cpcP25.toFixed(2) + ' | Median: $' + cpcP50.toFixed(2) + ' | P75: $' + cpcP75.toFixed(2) + ' | Max: $' + cpcMax.toFixed(2) + ' | Mean: $' + cpcMean.toFixed(2));
  console.log('  $0 CPC keywords: ' + zeroCpc + ' (' + (zeroCpc / data.length * 100).toFixed(1) + '%)');

  console.log('\nVolume Distribution:');
  console.log('  Min: ' + volMin + ' | P25: ' + volP25 + ' | Median: ' + volP50 + ' | P75: ' + volP75 + ' | Max: ' + volMax);
  console.log('  0 volume: ' + zeroVol);

  // === FILTER TESTS ===

  // Conservative: CPC > p75 AND volume < p25
  const conservative = data.filter(d => {
    const cpcRank = percentileRank(cpcs, d.avgCpc);
    const volRank = percentileRank(vols, d.volume);
    return cpcRank > 75 && volRank < 25;
  });

  // Moderate: (CPC > p50 AND vol < p25) OR (CPC > p75 AND vol < p50)
  const moderate = data.filter(d => {
    const cpcRank = percentileRank(cpcs, d.avgCpc);
    const volRank = percentileRank(vols, d.volume);
    return (cpcRank > 50 && volRank < 25) || (cpcRank > 75 && volRank < 50);
  });

  // Aggressive: CPC percentile - volume percentile > 50
  const aggressive = data.filter(d => {
    const cpcRank = percentileRank(cpcs, d.avgCpc);
    const volRank = percentileRank(vols, d.volume);
    return (cpcRank - volRank) > 50;
  });

  console.log('\n--- FILTER RESULTS (keywords REMOVED) ---');
  console.log('  Conservative (CPC>p75 AND vol<p25): ' + conservative.length + ' removed (' + (conservative.length / data.length * 100).toFixed(1) + '%)');
  console.log('  Moderate:                           ' + moderate.length + ' removed (' + (moderate.length / data.length * 100).toFixed(1) + '%)');
  console.log('  Aggressive (CPC% - Vol% > 50):      ' + aggressive.length + ' removed (' + (aggressive.length / data.length * 100).toFixed(1) + '%)');

  // Sample removed by conservative
  console.log('\n  Sample REMOVED by Conservative (top 10 by CPC):');
  conservative.sort((a, b) => b.avgCpc - a.avgCpc);
  for (const kw of conservative.slice(0, 10)) {
    console.log('    "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition + ' score:' + kw.score);
  }

  // Borderline: removed by aggressive but not conservative
  console.log('\n  Borderline (removed by Aggressive, kept by Conservative, top 10):');
  const borderline = aggressive.filter(d => !conservative.some(c => c.keyword === d.keyword));
  borderline.sort((a, b) => b.avgCpc - a.avgCpc);
  for (const kw of borderline.slice(0, 10)) {
    console.log('    "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' comp:' + kw.competition + ' score:' + kw.score);
  }

  // Safety check: high-scoring keywords we'd remove
  const removedHighScore = conservative.filter(d => d.score >= 70);
  console.log('\n  SAFETY CHECK — Conservative removes ' + removedHighScore.length + ' keywords with score >= 70:');
  for (const kw of removedHighScore.slice(0, 5)) {
    console.log('    "' + kw.keyword + '" vol:' + kw.volume + ' CPC:$' + kw.avgCpc.toFixed(2) + ' score:' + kw.score);
  }
}
