import { useState } from 'react';
import type { KeywordResult } from '@jackpotkeywords/shared';
import { forecastKeywords } from '../services/api';
import { isEffectiveAdmin } from '../lib/adminMode';
import UpgradePrompt from './UpgradePrompt';

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
  const isAdmin = isEffectiveAdmin(profile?.email);
  const userPlan = profile?.plan || 'free';
  const hasAccess = paid || isAdmin || userPlan === 'pro' || userPlan === 'agency';
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'budget' | 'volume'>('budget');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');
  const [inputValue, setInputValue] = useState<number>(10);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastedCount, setForecastedCount] = useState(0);
  const [forecastedMode, setForecastedMode] = useState<'budget' | 'volume'>('budget');
  const [forecastedPeriod, setForecastedPeriod] = useState<'daily' | 'monthly'>('daily');

  const selectedCount = selectedKeywords.size;
  const needsRecalculate = forecast && (selectedCount !== forecastedCount);
  const canCalculate = selectedCount > 0 && selectedCount <= 50 && inputValue > 0 && hasAccess;

  // For the API, always convert to daily budget
  const getDailyBudget = (): number => {
    if (mode === 'budget') {
      return period === 'monthly' ? Math.round((inputValue / 30) * 100) / 100 : inputValue;
    }
    // Volume mode: estimate budget from target clicks and avg CPC of selected keywords
    const selectedKws = keywords.filter((kw) => selectedKeywords.has(kw.keyword));
    const avgCpc = selectedKws.reduce((sum, kw) => sum + (kw.lowCpc + kw.highCpc) / 2, 0) / (selectedKws.length || 1);
    const targetClicksDaily = period === 'monthly' ? inputValue / 30 : inputValue;
    return Math.round(targetClicksDaily * avgCpc * 100) / 100;
  };

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
      const dailyBudget = getDailyBudget();
      const result = await forecastKeywords(token, selectedKws, Math.max(dailyBudget, 0.01));
      setForecast(result);
      setForecastedCount(selectedCount);
      setForecastedMode(mode);
      setForecastedPeriod(period);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Display values adapted to current period (even if forecast was computed in a different period)
  const multiplier = period === 'monthly' ? 30 : 1;
  const periodLabel = period === 'daily' ? '/day' : '/mo';
  const periodLabelFull = period === 'daily' ? 'Daily' : 'Monthly';

  const displayTotals = forecast ? {
    clicks: Math.round(forecast.totals.clicks / 30 * multiplier),
    impressions: Math.round(forecast.totals.impressions / 30 * multiplier),
    cost: Math.round(forecast.totals.cost / 30 * multiplier * 100) / 100,
  } : null;

  const headerSummary = forecast
    ? mode === 'budget'
      ? `$${displayTotals!.cost.toFixed(2)}${periodLabel} est.`
      : `${displayTotals!.clicks.toLocaleString()} clicks${periodLabel} est.`
    : '';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white uppercase tracking-wider">Budget Calculator</span>
          {headerSummary && (
            <span className="text-xs text-gray-500">{headerSummary}</span>
          )}
        </div>
        <span className={`text-gray-500 text-lg transition-transform ${expanded ? 'rotate-180' : ''}`}>&#9660;</span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-5">
          {/* Not signed in */}
          {!user ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-3">Sign in to use the Budget Calculator</p>
              <button onClick={signInWithGoogle} className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2 rounded-lg text-sm transition">
                Sign In
              </button>
            </div>
          ) : !hasAccess ? (
            <div className="py-4">
              <UpgradePrompt mode="inline" featureName="Budget Calculator" />
            </div>
          ) : (
            <>
              {/* Controls row */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                {/* Mode toggle */}
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setMode('budget')}
                    className={`px-3 py-1.5 rounded-md text-xs transition ${mode === 'budget' ? 'bg-jackpot-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
                  >
                    Budget &rarr; Volume
                  </button>
                  <button
                    onClick={() => setMode('volume')}
                    className={`px-3 py-1.5 rounded-md text-xs transition ${mode === 'volume' ? 'bg-jackpot-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
                  >
                    Volume &rarr; Budget
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-700" />

                {/* Period toggle */}
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setPeriod('daily')}
                    className={`px-3 py-1.5 rounded-md text-xs transition ${period === 'daily' ? 'bg-jackpot-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setPeriod('monthly')}
                    className={`px-3 py-1.5 rounded-md text-xs transition ${period === 'monthly' ? 'bg-jackpot-500 text-black font-medium' : 'text-gray-400 hover:text-white'}`}
                  >
                    Monthly
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-700" />

                {/* Input */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {mode === 'budget' ? 'Budget:' : 'Target:'}
                  </span>
                  <div className="relative">
                    {mode === 'budget' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                    )}
                    <input
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(Number(e.target.value) || 0)}
                      className={`w-28 bg-gray-800 border border-gray-700 rounded-lg pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500 ${mode === 'budget' ? 'pl-7' : 'pl-3'}`}
                    />
                  </div>
                  <span className="text-sm text-gray-400">
                    {mode === 'budget' ? periodLabel : `clicks${periodLabel}`}
                  </span>
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

                {selectedCount > 0 && (
                  <span className="text-xs text-jackpot-400 bg-jackpot-500/10 px-2.5 py-1 rounded-md border border-jackpot-500/20">
                    {selectedCount} keyword{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                )}

                {selectedCount > 50 && (
                  <span className="text-xs text-yellow-500">Max 50 keywords</span>
                )}
              </div>

              {/* No keywords selected */}
              {selectedCount === 0 && (
                <p className="text-gray-500 text-sm text-center py-6">
                  Select keywords from the table below to estimate campaign costs.
                  <br />
                  <span className="text-gray-600">Checkbox 1+ keywords to activate the calculator.</span>
                </p>
              )}

              {/* Keywords selected but no forecast yet */}
              {selectedCount > 0 && !forecast && !loading && (
                <p className="text-gray-500 text-sm text-center py-3">
                  {mode === 'budget' ? 'Enter a budget' : 'Enter a target click volume'} and click Calculate
                </p>
              )}

              {error && (
                <p className="text-red-400 text-sm text-center py-2">{error}</p>
              )}

              {/* Forecast results — persist across toggle changes */}
              {forecast && displayTotals && (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{displayTotals.clicks.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Est. {periodLabelFull} Clicks</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{displayTotals.impressions.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Est. Impressions</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-jackpot-400">${displayTotals.cost.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Est. {periodLabelFull} Cost</div>
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

                  {/* Per-keyword breakdown (desktop) */}
                  <div className="hidden md:block bg-gray-800/30 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500">
                          <th className="text-left px-3 py-2 font-medium">Keyword</th>
                          <th className="text-right px-3 py-2 font-medium">Clicks{periodLabel}</th>
                          <th className="text-right px-3 py-2 font-medium">Impressions</th>
                          <th className="text-right px-3 py-2 font-medium">CPC</th>
                          <th className="text-right px-3 py-2 font-medium">Cost{periodLabel}</th>
                          <th className="text-right px-3 py-2 font-medium">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.keywords.map((kw, i) => {
                          const kwClicks = Math.round(kw.clicks / 30 * multiplier);
                          const kwImpr = Math.round(kw.impressions / 30 * multiplier);
                          const kwCost = Math.round(kw.cost / 30 * multiplier * 100) / 100;
                          return (
                            <tr key={i} className="border-b border-gray-800/30">
                              <td className="px-3 py-2 text-gray-300 truncate max-w-[200px]">{kw.keyword}</td>
                              <td className="px-3 py-2 text-right text-white font-mono">{kwClicks.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-gray-400 font-mono">{kwImpr.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-gray-300 font-mono">${kw.cpc.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-jackpot-400 font-mono">${kwCost.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-gray-400 font-mono">{kw.ctr.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-700 font-semibold">
                          <td className="px-3 py-2 text-white">Total</td>
                          <td className="px-3 py-2 text-right text-white font-mono">{displayTotals.clicks.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-300 font-mono">{displayTotals.impressions.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-gray-300 font-mono">${forecast.totals.avgCpc.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-jackpot-400 font-mono">${displayTotals.cost.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-300 font-mono">{forecast.totals.avgCtr.toFixed(1)}%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile breakdown */}
                  <div className="md:hidden space-y-2">
                    {forecast.keywords.map((kw, i) => {
                      const kwClicks = Math.round(kw.clicks / 30 * multiplier);
                      const kwCost = Math.round(kw.cost / 30 * multiplier * 100) / 100;
                      return (
                        <div key={i} className="bg-gray-800/30 rounded-lg p-3">
                          <div className="text-gray-300 text-sm truncate mb-1">{kw.keyword}</div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>{kwClicks.toLocaleString()} clicks</span>
                            <span>${kw.cpc.toFixed(2)} CPC</span>
                            <span className="text-jackpot-400">${kwCost.toFixed(2)}{periodLabel}</span>
                          </div>
                        </div>
                      );
                    })}
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
