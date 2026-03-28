import { useState } from 'react';
import { CATEGORY_LABELS } from '@jackpotkeywords/shared';
import type { KeywordCategory, KeywordResult } from '@jackpotkeywords/shared';
import MaskedKeyword from '../components/MaskedKeyword';
import JackpotScore from '../components/JackpotScore';
import SourceBadge from '../components/SourceBadge';
import BudgetFit from '../components/BudgetFit';
import TrendArrow from '../components/TrendArrow';

// TODO: Replace with real data from API
const DEMO_CATEGORIES: KeywordCategory[] = [
  'direct', 'feature', 'problem', 'audience', 'competitor_brand',
  'competitor_alt', 'use_case', 'niche', 'benefit', 'adjacent',
];

export default function Results() {
  const [activeCategory, setActiveCategory] = useState<KeywordCategory>('direct');
  const [scoreView, setScoreView] = useState<'ad' | 'seo'>('ad');

  // TODO: Load real results from searchId param
  const paid = false;
  const totalKeywords = 1247;
  const keywords: KeywordResult[] = [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {totalKeywords.toLocaleString()} keywords found
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Across 10 intent categories from 4 data sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Score view toggle */}
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setScoreView('ad')}
              className={`px-3 py-1.5 rounded-md text-sm transition ${
                scoreView === 'ad'
                  ? 'bg-jackpot-500 text-black font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Ad Score
            </button>
            <button
              onClick={() => setScoreView('seo')}
              className={`px-3 py-1.5 rounded-md text-sm transition ${
                scoreView === 'seo'
                  ? 'bg-jackpot-500 text-black font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              SEO Score
            </button>
          </div>
          {/* Export button */}
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              paid
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!paid}
            title={paid ? 'Export CSV' : 'Export available with Pro'}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-gray-800">
        {DEMO_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-2 rounded-t-lg text-sm transition ${
              activeCategory === cat
                ? 'bg-gray-800 text-jackpot-400 font-medium border-b-2 border-jackpot-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {CATEGORY_LABELS[cat]}
            <span className="ml-1.5 text-xs opacity-60">0</span>
          </button>
        ))}
      </div>

      {/* Keyword table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="text-left px-4 py-3 font-medium">Keyword</th>
              <th className="text-left px-4 py-3 font-medium">Source</th>
              <th className="text-right px-4 py-3 font-medium">Volume</th>
              <th className="text-right px-4 py-3 font-medium">CPC Range</th>
              <th className="text-center px-4 py-3 font-medium">Comp</th>
              <th className="text-center px-4 py-3 font-medium">Trend</th>
              <th className="text-center px-4 py-3 font-medium">
                {scoreView === 'ad' ? 'Ad Score' : 'SEO Score'}
              </th>
            </tr>
          </thead>
          <tbody>
            {keywords.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-500">
                  No results yet. Run a search to see keywords here.
                </td>
              </tr>
            )}
            {keywords.map((kw, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <MaskedKeyword keyword={kw.keyword} paid={paid} />
                </td>
                <td className="px-4 py-3">
                  <SourceBadge source={kw.source} />
                </td>
                <td className="px-4 py-3 text-right text-white font-mono">
                  {kw.avgMonthlySearches.toLocaleString()}/mo
                </td>
                <td className="px-4 py-3 text-right text-gray-300 font-mono">
                  ${kw.lowCpc.toFixed(2)}-${kw.highCpc.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${
                    kw.competition === 'LOW' ? 'text-score-green' :
                    kw.competition === 'MEDIUM' ? 'text-score-yellow' :
                    'text-score-red'
                  }`}>
                    {kw.competition}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {kw.trendDirection ? (
                    <TrendArrow direction={kw.trendDirection} info={kw.trendInfo} />
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <JackpotScore
                    score={scoreView === 'ad' ? kw.adScore : kw.seoScore}
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paywall CTA for free users */}
      {!paid && (
        <div className="mt-8 text-center bg-gradient-to-r from-jackpot-500/10 to-purple-500/10 border border-jackpot-500/20 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">
            Unlock all {totalKeywords.toLocaleString()} keywords
          </h2>
          <p className="text-gray-400 mb-4">
            See every keyword, CPC, trend, and score. Export to CSV or Google Ads.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition">
              Unlock for $0.99
            </button>
            <span className="text-gray-500">or</span>
            <button className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl transition">
              Go unlimited — $5.99/mo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
