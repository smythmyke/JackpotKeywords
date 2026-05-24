import type { CompetitionLevel, TrendDirection, BudgetFit } from './search';

/**
 * Jackpot Score formula weights
 */
export const AD_SCORE_WEIGHTS = {
  volume: 0.30,
  cpcInverse: 0.25,
  competitionInverse: 0.20,
  relevance: 0.15,
  trend: 0.10,
};

export const SEO_SCORE_WEIGHTS = {
  volume: 0.30,
  cpcDirect: 0.20,
  competitionInverse: 0.25,
  relevance: 0.15,
  trend: 0.10,
};


export function volumeScore(avgMonthlySearches: number): number {
  if (avgMonthlySearches <= 0) return 0;
  const log = Math.log10(avgMonthlySearches);
  return Math.min(100, Math.round(log * 30));
}

export function cpcInverseScore(avgCpc: number): number {
  if (avgCpc <= 0.01) return 100;
  if (avgCpc <= 0.50) return 90;
  if (avgCpc <= 1.00) return 70;
  if (avgCpc <= 3.00) return 50;
  if (avgCpc <= 5.00) return 40;
  if (avgCpc <= 10.00) return 20;
  if (avgCpc <= 50.00) return 5;
  return 0;
}

export function cpcDirectScore(avgCpc: number): number {
  if (avgCpc >= 50) return 100;
  if (avgCpc >= 10) return 70;
  if (avgCpc >= 5) return 50;
  if (avgCpc >= 1) return 30;
  if (avgCpc >= 0.10) return 15;
  return 10;
}

export function competitionScore(competition: CompetitionLevel): number {
  switch (competition) {
    case 'LOW': return 100;
    case 'MEDIUM': return 50;
    case 'HIGH': return 10;
    default: return 50;
  }
}

export function trendBonus(trend?: TrendDirection): number {
  switch (trend) {
    case 'rising': return 20;
    case 'rising_slight': return 10;
    case 'stable': return 0;
    case 'declining_slight': return -5;
    case 'declining': return -10;
    default: return 0;
  }
}

export function calculateAdScore(
  volume: number,
  lowCpc: number,
  highCpc: number,
  competition: CompetitionLevel,
  relevance: number,
  trend?: TrendDirection,
): number {
  const avgCpc = (lowCpc + highCpc) / 2;
  const weights = AD_SCORE_WEIGHTS;

  const score =
    volumeScore(volume) * weights.volume +
    cpcInverseScore(avgCpc) * weights.cpcInverse +
    competitionScore(competition) * weights.competitionInverse +
    (relevance * 20) * weights.relevance +
    Math.max(0, 50 + trendBonus(trend)) * weights.trend;

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function calculateSeoScore(
  volume: number,
  lowCpc: number,
  highCpc: number,
  competition: CompetitionLevel,
  relevance: number,
  trend?: TrendDirection,
): number {
  const avgCpc = (lowCpc + highCpc) / 2;
  const w = SEO_SCORE_WEIGHTS;

  const score =
    volumeScore(volume) * w.volume +
    cpcDirectScore(avgCpc) * w.cpcDirect +
    competitionScore(competition) * w.competitionInverse +
    (relevance * 20) * w.relevance +
    Math.max(0, 50 + trendBonus(trend)) * w.trend;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ---- v2 scoring (Shape A-prime defense) ----
// GKP becomes a minority signal (~25%) blended with non-GKP inputs.
// See docs/api-deployment/SCORING-V2-DESIGN.md.

export const JACKPOT_SCORE_V2_WEIGHTS = {
  gkpComposite: 0.25,
  aiRelevance: 0.30,
  suggestDepth: 0.20,
  clusterFit: 0.15,
  trend: 0.10,
};

export function gkpCompositeScore(
  volume: number,
  avgCpc: number,
  competition: CompetitionLevel,
): number {
  const score =
    volumeScore(volume) * 0.50 +
    cpcInverseScore(avgCpc) * 0.30 +
    competitionScore(competition) * 0.20;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function suggestDepthScore(suggestHits: number, maxPlatforms: number): number {
  if (maxPlatforms <= 0) return 0;
  const ratio = Math.min(1, suggestHits / maxPlatforms);
  return Math.round(ratio * 100);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

export function clusterFitScore(
  cluster: { totalVolume: number; keywordCount: number },
  clusterVolumeP90: number,
): number {
  if (clusterVolumeP90 <= 0) return 50;
  const volumePart = Math.min(1, cluster.totalVolume / clusterVolumeP90) * 50;
  const densityPart = Math.min(1, cluster.keywordCount / 20) * 50;
  return Math.round(volumePart + densityPart);
}

export function aiRelevanceScore(aiRelevance?: number): number {
  if (aiRelevance === undefined || aiRelevance === null) return 50;
  return Math.round((aiRelevance / 10) * 100);
}

export interface JackpotScoreV2Input {
  volume: number;
  lowCpc: number;
  highCpc: number;
  competition: CompetitionLevel;
  trend?: TrendDirection;
  suggestHits?: number;
  maxPlatforms?: number;
  cluster?: { totalVolume: number; keywordCount: number };
  clusterVolumeP90?: number;
  aiRelevance?: number;
}

export function calculateJackpotScoreV2(input: JackpotScoreV2Input): number {
  const avgCpc = (input.lowCpc + input.highCpc) / 2;
  const w = JACKPOT_SCORE_V2_WEIGHTS;

  const gkp = gkpCompositeScore(input.volume, avgCpc, input.competition);
  const ai = aiRelevanceScore(input.aiRelevance);
  const depth = suggestDepthScore(input.suggestHits ?? 1, input.maxPlatforms ?? 1);
  const fit = input.cluster && input.clusterVolumeP90 !== undefined
    ? clusterFitScore(input.cluster, input.clusterVolumeP90)
    : 50;
  const trend = Math.max(0, 50 + trendBonus(input.trend));

  const score =
    gkp * w.gkpComposite +
    ai * w.aiRelevance +
    depth * w.suggestDepth +
    fit * w.clusterFit +
    trend * w.trend;

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function calculateBudgetFit(
  lowCpc: number,
  highCpc: number,
  monthlyBudget: number,
): { fit: BudgetFit; clicksPerDay: number } {
  const avgCpc = (lowCpc + highCpc) / 2;
  const dailyBudget = monthlyBudget / 30;
  const clicksPerDay = avgCpc > 0 ? dailyBudget / avgCpc : 999;

  let fit: BudgetFit;
  if (clicksPerDay >= 10) fit = 'great';
  else if (clicksPerDay >= 3) fit = 'tight';
  else fit = 'over';

  return { fit, clicksPerDay: Math.round(clicksPerDay * 10) / 10 };
}
