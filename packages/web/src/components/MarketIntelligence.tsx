import { useState, useMemo } from 'react';
import type { KeywordResult } from '@jackpotkeywords/shared';

interface MarketIntelligenceProps {
  keywords: KeywordResult[];
  productLabel?: string;
}

function volumeScore(totalVol: number): number {
  if (totalVol <= 0) return 0;
  return Math.min(100, Math.log10(Math.max(1, totalVol)) * 15);
}

function marketValueScore(avgCpc: number): number {
  if (avgCpc <= 0) return 0;
  if (avgCpc >= 10) return 100;
  if (avgCpc >= 5) return 90;
  if (avgCpc >= 3) return 70;
  if (avgCpc >= 1) return 50;
  if (avgCpc >= 0.5) return 30;
  return 15;
}

function competitorValidationScore(count: number): number {
  if (count >= 8) return 100;
  if (count >= 5) return 90;
  if (count >= 3) return 70;
  if (count >= 2) return 50;
  if (count >= 1) return 30;
  return 0;
}

function getVerdict(score: number, metrics: {
  trendMomentum: number;
  competitionGap: number;
  avgCpc: number;
}): string {
  let base = '';
  if (score >= 80) base = 'Strong market demand with accessible competition.';
  else if (score >= 60) base = 'Moderate demand with opportunity. Focus on goldmine keywords.';
  else if (score >= 40) base = 'Emerging market. Early positioning could pay off.';
  else if (score >= 20) base = 'Niche market. Highly specialized audience.';
  else base = 'Very early stage. Build awareness through content.';

  const modifiers: string[] = [];
  if (metrics.trendMomentum > 50) modifiers.push('Trending upward.');
  else if (metrics.trendMomentum < 20) modifiers.push('Limited growth signals.');
  if (metrics.competitionGap < 30) modifiers.push('Competitive — consider SEO strategy.');
  if (metrics.avgCpc <= 0.01) modifiers.push('No ad spend detected — organic play.');

  return modifiers.length > 0 ? `${base} ${modifiers.join(' ')}` : base;
}

function MetricBar({ label, value, score, color }: { label: string; value: string; score: number; color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-gray-500 shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color || 'bg-jackpot-500'}`}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
      <div className="w-20 text-xs text-gray-400 text-right shrink-0">{value}</div>
    </div>
  );
}

export default function MarketIntelligence({ keywords, productLabel }: MarketIntelligenceProps) {
  const [expanded, setExpanded] = useState(true);

  const data = useMemo(() => {
    if (keywords.length === 0) return null;

    // Volume
    const totalVol = keywords.reduce((s, k) => s + k.avgMonthlySearches, 0);
    const volScore = volumeScore(totalVol);

    // Market Value (volume-weighted avg CPC)
    const kwsWithVol = keywords.filter((k) => k.avgMonthlySearches > 0);
    const totalWeightedCpc = kwsWithVol.reduce((s, k) => s + ((k.lowCpc + k.highCpc) / 2) * k.avgMonthlySearches, 0);
    const totalWeightVol = kwsWithVol.reduce((s, k) => s + k.avgMonthlySearches, 0);
    const avgCpc = totalWeightVol > 0 ? totalWeightedCpc / totalWeightVol : 0;
    const mktScore = marketValueScore(avgCpc);

    // Competition Gap
    const lowCount = keywords.filter((k) => k.competition === 'LOW').length;
    const compGap = (lowCount / keywords.length) * 100;
    const compScore = compGap;

    // Trend Momentum
    const withTrend = keywords.filter((k) => k.trendDirection);
    const risingCount = withTrend.filter((k) => k.trendDirection === 'rising' || k.trendDirection === 'rising_slight').length;
    const trendMomentum = withTrend.length > 0 ? (risingCount / withTrend.length) * 100 : 50;
    const trendScore = trendMomentum;

    // Competitor Validation
    const competitorKws = keywords.filter((k) => k.category === 'competitor_brand' && k.avgMonthlySearches > 0);
    const uniqueCompetitors = new Set(competitorKws.map((k) => k.keyword.toLowerCase().split(/\s+/).slice(0, 2).join(' '))).size;
    const compValScore = competitorValidationScore(uniqueCompetitors);

    // Demand Score
    const demandScore = Math.round(Math.min(100, Math.max(0,
      volScore * 0.30 +
      mktScore * 0.20 +
      compScore * 0.20 +
      trendScore * 0.15 +
      compValScore * 0.15
    )));

    // Opportunity counts
    const quickWins = keywords.filter((k) => k.adScore >= 75).length;
    const contentPlays = keywords.filter((k) => k.seoScore >= 60 && k.adScore < 75).length;
    const adGoldmines = keywords.filter((k) => (k.lowCpc + k.highCpc) / 2 < 1 && k.avgMonthlySearches >= 100).length;
    const expensive = keywords.filter((k) => k.adScore < 30).length;

    // Related niches from adjacent + niche categories
    const nicheKws = keywords.filter((k) => k.category === 'adjacent' || k.category === 'niche');
    const nicheGroups = new Map<string, { volume: number; cpc: number; count: number }>();
    for (const kw of nicheKws) {
      const words = kw.keyword.toLowerCase().split(/\s+/);
      const prefix = words.slice(0, 2).join(' ');
      const existing = nicheGroups.get(prefix) || { volume: 0, cpc: 0, count: 0 };
      existing.volume += kw.avgMonthlySearches;
      existing.cpc += (kw.lowCpc + kw.highCpc) / 2;
      existing.count += 1;
      nicheGroups.set(prefix, existing);
    }
    const relatedNiches = [...nicheGroups.entries()]
      .map(([name, data]) => ({ name, volume: data.volume, cpc: Math.round((data.cpc / data.count) * 100) / 100 }))
      .filter((n) => n.volume > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    const verdict = getVerdict(demandScore, { trendMomentum, competitionGap: compGap, avgCpc });

    return {
      demandScore, verdict, totalVol, avgCpc,
      volScore, mktScore, compGap, compScore, trendMomentum, trendScore, compValScore,
      uniqueCompetitors, quickWins, contentPlays, adGoldmines, expensive, relatedNiches,
    };
  }, [keywords]);

  if (!data) return null;

  const scoreColor = data.demandScore >= 60 ? 'text-score-green' : data.demandScore >= 40 ? 'text-score-yellow' : 'text-score-red';
  const scoreLabel = data.demandScore >= 80 ? 'Strong' : data.demandScore >= 60 ? 'Good' : data.demandScore >= 40 ? 'Moderate' : data.demandScore >= 20 ? 'Niche' : 'Early';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white uppercase tracking-wider">Market Intelligence</span>
          <span className={`text-lg font-bold ${scoreColor}`}>{data.demandScore}</span>
          <span className="text-xs text-gray-500">{scoreLabel} demand</span>
        </div>
        <span className={`text-gray-500 text-lg transition-transform ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-5">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Demand Score */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`text-5xl font-bold ${scoreColor}`}>{data.demandScore}</div>
              <div className="text-sm text-gray-400 mt-1">{scoreLabel} Demand</div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed max-w-[250px]">{data.verdict}</p>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-3">
              <MetricBar label="Volume" value={`${data.totalVol.toLocaleString()}/mo`} score={data.volScore} />
              <MetricBar label="Market Value" value={`$${data.avgCpc.toFixed(2)} avg`} score={data.mktScore} />
              <MetricBar label="Comp Gap" value={`${Math.round(data.compGap)}% LOW`} score={data.compScore} />
              <MetricBar label="Trends" value={`${Math.round(data.trendMomentum)}% rising`} score={data.trendScore} />
              <MetricBar label="Competitors" value={`${data.uniqueCompetitors} found`} score={data.compValScore} />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-score-green">{data.quickWins}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Quick Wins</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-400">{data.contentPlays}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Content Plays</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-jackpot-400">{data.adGoldmines}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Ad Goldmines</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-500">{data.expensive}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Expensive</div>
              </div>
            </div>
          </div>

          {/* Related Niches */}
          {data.relatedNiches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Related Niches</div>
              <div className="flex flex-wrap gap-2">
                {data.relatedNiches.map((niche) => (
                  <span
                    key={niche.name}
                    className="bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-full text-xs"
                  >
                    {niche.name}
                    <span className="text-gray-500 ml-1.5">{niche.volume.toLocaleString()}/mo</span>
                    {niche.cpc > 0 && <span className="text-gray-600 ml-1">${niche.cpc.toFixed(2)}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
