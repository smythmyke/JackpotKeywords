import type { KeywordResult } from '@jackpotkeywords/shared';

export interface ConversionModalMetrics {
  jackpots: number;
  goldmines: number;
  totalVolume: number;
  avgCpcCents: number;
  totalKeywords: number;
}

export interface ConversionModalTopRow {
  score: number;
  cpc: number;
  volume: number;
}

/**
 * Pure computation of the four summary metrics shown in the conversion modal.
 *
 * Duplicates the per-keyword filter math from MarketIntelligence.tsx:112-115
 * intentionally — keeping the two independent avoids entangling the modal with
 * the panel's expand/collapse lifecycle. If the goldmine or jackpot definition
 * ever changes, update both in the same edit.
 */
export function computeModalMetrics(keywords: KeywordResult[]): ConversionModalMetrics {
  if (!keywords || keywords.length === 0) {
    return { jackpots: 0, goldmines: 0, totalVolume: 0, avgCpcCents: 0, totalKeywords: 0 };
  }

  let jackpots = 0;
  let goldmines = 0;
  let totalVolume = 0;
  let cpcSum = 0;
  let cpcCount = 0;

  for (const kw of keywords) {
    if (kw.adScore >= 75) jackpots += 1;
    const avgCpc = (kw.lowCpc + kw.highCpc) / 2;
    if (avgCpc < 1 && kw.avgMonthlySearches >= 100) goldmines += 1;
    totalVolume += kw.avgMonthlySearches || 0;
    if (avgCpc > 0) {
      cpcSum += avgCpc;
      cpcCount += 1;
    }
  }

  const avgCpc = cpcCount > 0 ? cpcSum / cpcCount : 0;

  return {
    jackpots,
    goldmines,
    totalVolume,
    avgCpcCents: Math.round(avgCpc * 100),
    totalKeywords: keywords.length,
  };
}

/**
 * Top 3 keywords by jackpotScore. Keywords from the backend are already
 * server-sorted by jackpotScore desc (`search.ts:56,163,513`), so slicing
 * the first three is safe — but we sort defensively in case a future code
 * path skips the sort.
 */
export function computeTopThree(keywords: KeywordResult[]): ConversionModalTopRow[] {
  if (!keywords || keywords.length === 0) return [];
  const sorted = [...keywords].sort((a, b) => b.jackpotScore - a.jackpotScore);
  return sorted.slice(0, 3).map((kw) => ({
    score: Math.round(kw.jackpotScore),
    cpc: (kw.lowCpc + kw.highCpc) / 2,
    volume: kw.avgMonthlySearches,
  }));
}
