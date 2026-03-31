import { useState } from 'react';
import type { KeywordResult } from '@jackpotkeywords/shared';
import { forecastKeywords } from '../services/api';

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

interface BudgetCalculatorProps {
  keywords: KeywordResult[];
  selectedKeywords: Set<string>;
  paid: boolean;
  user: any;
  profile: any;
  signInWithGoogle: () => void;
  getToken: () => Promise<string | null>;
}

interface ForecastData {
  keywords: { keyword: string; clicks: number; impressions: number; cost: number; cpc: number; ctr: number }[];
  totals: { clicks: number; impressions: number; cost: number; avgCpc: number; avgCtr: number };
  isEstimate: boolean;
}

export default function BudgetCalculator({ keywords, selectedKeywords, paid, user, profile, signInWithGoogle, getToken }: BudgetCalculatorProps) {
  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);
  const userPlan = profile?.plan || 'free';
  const hasAccess = paid || isAdmin || userPlan === 'pro' || userPlan === 'agency';
  const [expanded, setExpanded] = useState(false);
  const [budgetType, setBudgetType] = useState<'daily' | 'monthly'>('monthly');
  const [budgetAmount, setBudgetAmount] = useState<number>(500);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastedCount, setForecastedCount] = useState(0);

  const selectedCount = selectedKeywords.size;
  const needsRecalculate = forecast && selectedCount !== forecastedCount;
  const canCalculate = selectedCount > 0 && selectedCount <= 50 && budgetAmount > 0 && hasAccess;
  const dailyBudget = budgetType === 'monthly' ? Math.round((budgetAmount / 30) * 100) / 100 : budgetAmount;

  const handleCalculate = async () => {
    if (!canCalculate) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const selectedKws = keywords
        .filter((kw) => selectedKeywords.has(kw.keyword))
        .map((kw) => ({ keyword: kw.keyword, lowCpc: kw.lowCpc, highCpc: kw.highCpc, avgMonthlySearches: kw.avgMonthlySearches }));
      const result = await forecastKeywords(token, selectedKws, dailyBudget);
      setForecast(result);
      setForecastedCount(selectedCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white uppercase tracking-wider">Budget Calculator</span>
          {forecast && (
            <span className="text-xs text-gray-500">
              ${forecast.totals.cost.toFixed(2)}/mo est.
            </span>
          )}
        </div>
        <span className={`text-gray-500 text-lg transition-transform ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-5">
          {/* Not paid */}
          {!user ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-3">Sign in to use the Budget Calculator</p>
              <button onClick={signInWithGoogle} className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2 rounded-lg text-sm transition">
                Sign In
              </button>
            </div>
          ) : !hasAccess ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-2">Budget Calculator is available for Pro subscribers</p>
              <a href="/pricing" className="text-jackpot-400 hover:text-jackpot-300 text-sm font-medium transition">
                Upgrade to Pro &rarr;
              </a>
            </div>
          ) : (
            <>
              {/* Budget input row */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Budget:</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(Number(e.target.value) || 0)}
                      className="w-28 bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500"
                    />
                  </div>
                </div>
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setBudgetType('daily')}
                    className={`px-3 py-1.5 rounded-md text-xs transition ${budgetType === 'daily' ? 'bg-jackpot-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setBudgetType('monthly')}
                    className={`px-3 py-1.5 rounded-md text-xs transition ${budgetType === 'monthly' ? 'bg-jackpot-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
                  >
                    Monthly
                  </button>
                </div>
                <button
                  onClick={handleCalculate}
                  disabled={!canCalculate || loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    canCalculate && !loading
                      ? 'bg-jackpot-500 hover:bg-jackpot-600 text-black'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Calculating...' : needsRecalculate ? 'Recalculate' : 'Calculate'}
                </button>
                {selectedCount > 50 && (
                  <span className="text-xs text-score-yellow">Max 50 keywords</span>
                )}
              </div>

              {/* Status messages */}
              {selectedCount === 0 && (
                <p className="text-gray-500 text-sm text-center py-3">
                  Select keywords from the table below to simulate a campaign
                </p>
              )}
              {selectedCount > 0 && !forecast && !loading && (
                <p className="text-gray-500 text-sm text-center py-3">
                  {selectedCount} keyword{selectedCount !== 1 ? 's' : ''} selected &middot; Enter a budget and click Calculate
                </p>
              )}
              {error && (
                <p className="text-red-400 text-sm text-center py-2">{error}</p>
              )}

              {/* Forecast results */}
              {forecast && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{forecast.totals.clicks.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Est. Monthly Clicks</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{forecast.totals.impressions.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Est. Impressions</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-jackpot-400">${forecast.totals.cost.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Est. Monthly Cost</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">${forecast.totals.avgCpc.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Avg CPC</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{forecast.totals.avgCtr.toFixed(1)}%</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Est. CTR</div>
                    </div>
                  </div>

                  {forecast.isEstimate && (
                    <p className="text-xs text-gray-600 text-center mb-3">
                      Estimates based on CPC data. Actual results may vary.
                    </p>
                  )}

                  {/* Per-keyword breakdown */}
                  <div className="hidden md:block bg-gray-800/30 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500">
                          <th className="text-left px-3 py-2 font-medium">Keyword</th>
                          <th className="text-right px-3 py-2 font-medium">Clicks/mo</th>
                          <th className="text-right px-3 py-2 font-medium">Impressions</th>
                          <th className="text-right px-3 py-2 font-medium">CPC</th>
                          <th className="text-right px-3 py-2 font-medium">Cost/mo</th>
                          <th className="text-right px-3 py-2 font-medium">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.keywords.map((kw, i) => (
                          <tr key={i} className="border-b border-gray-800/30">
                            <td className="px-3 py-2 text-gray-300 truncate max-w-[200px]">{kw.keyword}</td>
                            <td className="px-3 py-2 text-right text-white font-mono">{kw.clicks.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-gray-400 font-mono">{kw.impressions.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-gray-300 font-mono">${kw.cpc.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-jackpot-400 font-mono">${kw.cost.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-gray-400 font-mono">{kw.ctr.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-700 font-semibold">
                          <td className="px-3 py-2 text-white">Total</td>
                          <td className="px-3 py-2 text-right text-white font-mono">{forecast.totals.clicks.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-300 font-mono">{forecast.totals.impressions.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-300 font-mono">${forecast.totals.avgCpc.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-jackpot-400 font-mono">${forecast.totals.cost.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-300 font-mono">{forecast.totals.avgCtr.toFixed(1)}%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile breakdown */}
                  <div className="md:hidden space-y-2">
                    {forecast.keywords.map((kw, i) => (
                      <div key={i} className="bg-gray-800/30 rounded-lg p-3">
                        <div className="text-gray-300 text-sm truncate mb-1">{kw.keyword}</div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{kw.clicks.toLocaleString()} clicks</span>
                          <span>${kw.cpc.toFixed(2)} CPC</span>
                          <span className="text-jackpot-400">${kw.cost.toFixed(2)}/mo</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-gray-600 text-center">
                    {forecast.keywords.length} of 50 keyword limit used
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
