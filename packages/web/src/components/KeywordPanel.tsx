import type { KeywordResult } from '@jackpotkeywords/shared';

interface KeywordPanelProps {
  keyword: KeywordResult;
  relatedKeywords: KeywordResult[];
  selectedKeywords?: Set<string>;
  onToggleSelect?: (keyword: string) => void;
}

function getQuickTake(kw: KeywordResult): { label: string; color: string } {
  const vol = kw.avgMonthlySearches;
  const hasCpc = kw.highCpc > 0;
  const lowCpc = kw.highCpc < 2;
  const highVol = vol >= 1000;
  const midVol = vol >= 100;

  if (highVol && hasCpc && lowCpc) {
    return { label: 'Strong ad opportunity — high traffic, low cost', color: 'text-score-green' };
  }
  if (highVol && hasCpc && !lowCpc) {
    return { label: 'Competitive — consider SEO content instead of ads', color: 'text-score-yellow' };
  }
  if (highVol && !hasCpc) {
    return { label: 'High traffic, no bid data — SEO/content play', color: 'text-jackpot-400' };
  }
  if (midVol && hasCpc && lowCpc) {
    return { label: 'Niche opportunity — low competition entry point', color: 'text-score-green' };
  }
  if (midVol && !hasCpc) {
    return { label: 'Moderate traffic, no ad data — organic content target', color: 'text-gray-300' };
  }
  if (!midVol && hasCpc) {
    return { label: 'Low volume but advertisers are bidding — high intent niche', color: 'text-jackpot-400' };
  }
  return { label: 'Low volume, no ad data — long-tail content opportunity', color: 'text-gray-400' };
}

function getSeasonality(volumes: { month: string; volume: number }[]): string | null {
  if (!volumes || volumes.length < 6) return null;

  const vals = volumes.map((v) => v.volume);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  if (max === 0) return null;

  const ratio = min > 0 ? max / min : max;
  if (ratio < 3) return 'Consistent year-round';

  // Find peak months
  const threshold = max * 0.7;
  const peakMonths = volumes
    .filter((v) => v.volume >= threshold)
    .map((v) => v.month);

  if (peakMonths.length === 0) return null;
  return `Peaks in ${peakMonths.join(', ')}`;
}

function getBestTimeToBid(volumes: { month: string; volume: number }[]): string | null {
  if (!volumes || volumes.length < 6) return null;

  const vals = volumes.map((v) => v.volume);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg === 0) return null;

  // Find months with below-average volume (less competition, potentially cheaper)
  const lowMonths = volumes
    .filter((v) => v.volume > 0 && v.volume < avg * 0.7)
    .map((v) => v.month);

  if (lowMonths.length === 0) return null;
  return `Consider bidding in ${lowMonths.slice(0, 3).join(', ')} — lower competition`;
}

export default function KeywordPanel({ keyword: kw, relatedKeywords, selectedKeywords, onToggleSelect }: KeywordPanelProps) {
  const quickTake = getQuickTake(kw);
  const volumes = kw.monthlyVolumes || [];
  const maxVol = Math.max(...volumes.map((v) => v.volume), 1);
  const seasonality = getSeasonality(volumes);
  const bestTime = getBestTimeToBid(volumes);

  return (
    <div className="bg-gray-800/50 border-t border-gray-700 px-4 py-5">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Chart + insights */}
        <div>
          {/* Quick take */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Quick Take</div>
            <div className={`text-sm font-medium ${quickTake.color}`}>{quickTake.label}</div>
          </div>

          {/* Volume chart */}
          {volumes.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Monthly Volume (12mo)</div>
              <div className="flex gap-1" style={{ height: '80px' }}>
                {volumes.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center">
                    <div
                      className="w-full bg-jackpot-500 rounded-t hover:bg-jackpot-400 transition"
                      style={{
                        height: `${Math.max((v.volume / maxVol) * 100, 4)}%`,
                        minHeight: '3px',
                      }}
                      title={`${v.month}: ${v.volume.toLocaleString()}`}
                    />
                    <span className="text-[9px] text-gray-500 mt-1">{v.month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonality + best time */}
          <div className="space-y-1 text-sm">
            {seasonality && (
              <div>
                <span className="text-gray-500">Seasonality: </span>
                <span className="text-gray-300">{seasonality}</span>
              </div>
            )}
            {bestTime && (
              <div>
                <span className="text-gray-500">Tip: </span>
                <span className="text-gray-300">{bestTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Related keywords */}
        <div>
          {relatedKeywords.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  Related Keywords ({relatedKeywords.length})
                </span>
                {onToggleSelect && (
                  <span className="text-[10px] text-gray-600 italic">Click to select for export</span>
                )}
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {relatedKeywords.map((rk, i) => {
                  const isSelected = selectedKeywords?.has(rk.keyword);
                  return (
                    <div
                      key={i}
                      className={`flex items-center text-sm py-1.5 gap-3 rounded px-2 -mx-2 cursor-pointer transition ${
                        isSelected
                          ? 'bg-jackpot-500/10 border-l-2 border-jackpot-500'
                          : 'hover:bg-gray-700/30 border-l-2 border-transparent'
                      }`}
                      onClick={() => onToggleSelect?.(rk.keyword)}
                    >
                      <span className="text-gray-300 truncate flex-1">{rk.keyword}</span>
                      <span className="text-gray-500 text-xs whitespace-nowrap w-16 text-right font-mono">
                        {rk.avgMonthlySearches.toLocaleString()}/mo
                      </span>
                      <span className="text-gray-500 text-xs whitespace-nowrap w-24 text-right font-mono">
                        ${rk.lowCpc.toFixed(2)}-${rk.highCpc.toFixed(2)}
                      </span>
                      <span className={`text-xs font-bold whitespace-nowrap w-8 text-right ${
                        rk.adScore >= 80 ? 'text-score-green' :
                        rk.adScore >= 60 ? 'text-score-yellow' :
                        'text-gray-500'
                      }`}>
                        {rk.adScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {relatedKeywords.length === 0 && (
            <div className="text-sm text-gray-500">No closely related keywords found in this search.</div>
          )}
        </div>
      </div>
    </div>
  );
}
