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

export const BUDGET_AD_SCORE_WEIGHTS = {
  volume: 0.20,
  cpcInverse: 0.35,
  competitionInverse: 0.20,
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
  budget?: number,
): number {
  const avgCpc = (lowCpc + highCpc) / 2;
  const weights = budget ? BUDGET_AD_SCORE_WEIGHTS : AD_SCORE_WEIGHTS;

  let score =
    volumeScore(volume) * weights.volume +
    cpcInverseScore(avgCpc) * weights.cpcInverse +
    competitionScore(competition) * weights.competitionInverse +
    (relevance * 20) * weights.relevance +
    Math.max(0, 50 + trendBonus(trend)) * weights.trend;

  if (budget) {
    const dailyBudget = budget / 30;
    if (avgCpc > dailyBudget) {
      score = Math.min(score, 30);
    }
  }

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
