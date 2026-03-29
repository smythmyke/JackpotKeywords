import type { KeywordResult } from '@jackpotkeywords/shared';

interface KeywordPanelProps {
  keyword: KeywordResult;
  relatedKeywords: KeywordResult[];
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

export default function KeywordPanel({ keyword: kw, relatedKeywords }: KeywordPanelProps) {
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
              <div className="flex items-end gap-1 h-20">
                {volumes.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-jackpot-500/60 rounded-t hover:bg-jackpot-400/80 transition"
                      style={{ height: `${Math.max((v.volume / maxVol) * 100, 2)}%` }}
                      title={`${v.month}: ${v.volume.toLocaleString()}`}
                    />
                    <span className="text-[9px] text-gray-500">{v.month}</span>
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
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Related Keywords ({relatedKeywords.length})
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {relatedKeywords.map((rk, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-300 truncate mr-3">{rk.keyword}</span>
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {rk.avgMonthlySearches.toLocaleString()}/mo
                    </span>
                  </div>
                ))}
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
