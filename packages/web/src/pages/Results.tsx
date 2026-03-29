import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CATEGORY_LABELS } from '@jackpotkeywords/shared';
import type { KeywordCategory, KeywordResult, SearchResult } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { getSearchResult } from '../services/api';
import MaskedKeyword from '../components/MaskedKeyword';
import JackpotScore from '../components/JackpotScore';
import SourceBadge from '../components/SourceBadge';
import TrendArrow from '../components/TrendArrow';
import KeywordPanel from '../components/KeywordPanel';

const ALL_CATEGORIES: KeywordCategory[] = [
  'direct', 'feature', 'problem', 'audience', 'competitor_brand',
  'competitor_alt', 'use_case', 'niche', 'benefit', 'adjacent',
];

export default function Results() {
  const { searchId } = useParams<{ searchId: string }>();
  const { getToken } = useAuthContext();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<KeywordCategory>('direct');
  const [scoreView, setScoreView] = useState<'ad' | 'seo'>('ad');
  const [sortCol, setSortCol] = useState<string>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'keyword' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (col: string) =>
    sortCol === col ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  useEffect(() => {
    async function fetchResults() {
      if (!searchId) return;
      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const data = await getSearchResult(token, searchId);
        setResult(data);

        // Auto-select first category that has keywords
        const firstWithData = ALL_CATEGORIES.find(
          (cat) => data.keywords?.some((kw: KeywordResult) => kw.category === cat),
        );
        if (firstWithData) setActiveCategory(firstWithData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [searchId, getToken]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading results...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">{error || 'Results not found'}</div>
          <a href="/" className="text-jackpot-400 hover:underline">Run a new search</a>
        </div>
      </div>
    );
  }

  const paid = result.paid;
  const allKeywords = result.keywords || [];
  const totalKeywords = allKeywords.length;

  // Filter keywords by active category
  const filteredKeywords = allKeywords.filter((kw) => kw.category === activeCategory);

  // Sort
  const sortedKeywords = [...filteredKeywords].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sortCol) {
      case 'keyword': av = a.keyword.toLowerCase(); bv = b.keyword.toLowerCase(); break;
      case 'volume': av = a.avgMonthlySearches; bv = b.avgMonthlySearches; break;
      case 'cpc': av = a.highCpc; bv = b.highCpc; break;
      case 'comp': av = a.competition; bv = b.competition; break;
      case 'score': av = scoreView === 'ad' ? a.adScore : a.seoScore; bv = scoreView === 'ad' ? b.adScore : b.seoScore; break;
      default: av = scoreView === 'ad' ? a.adScore : a.seoScore; bv = scoreView === 'ad' ? b.adScore : b.seoScore;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Category counts
  const categoryCounts: Record<string, number> = {};
  ALL_CATEGORIES.forEach((c) => {
    categoryCounts[c] = allKeywords.filter((kw) => kw.category === c).length;
  });

  // For free users, show only top 3 per category; paginate for paid
  const paginatedKeywords = paid ? sortedKeywords.slice(0, visibleCount) : sortedKeywords.slice(0, 3);
  const displayKeywords = paginatedKeywords;
  const hasMore = paid && visibleCount < sortedKeywords.length;

  // Find related keywords for expanded panel (share 2+ words)
  function getRelatedKeywords(kw: KeywordResult): KeywordResult[] {
    const words = kw.keyword.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return allKeywords
      .filter((other) => {
        if (other.keyword === kw.keyword) return false;
        const otherWords = other.keyword.toLowerCase().split(/\s+/);
        const shared = words.filter((w) => otherWords.includes(w));
        return shared.length >= 2;
      })
      .slice(0, 10);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {totalKeywords.toLocaleString()} keywords found
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {result.query && <span>For &ldquo;{result.query}&rdquo; &middot; </span>}
            {result.metadata?.executionTimeMs && (
              <span>{(result.metadata.executionTimeMs / 1000).toFixed(1)}s &middot; </span>
            )}
            {result.metadata?.seedCount || 0} seeds &rarr; {totalKeywords} keywords
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setVisibleCount(50); setExpandedKeyword(null); }}
            className={`px-3 py-2.5 rounded-lg text-sm transition text-left ${
              activeCategory === cat
                ? 'bg-jackpot-500/15 text-jackpot-400 border border-jackpot-500/40 font-medium'
                : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-300'
            }`}
          >
            <div className="truncate">{CATEGORY_LABELS[cat]}</div>
            <div className="text-xs opacity-60 mt-0.5">{categoryCounts[cat]} keywords</div>
          </button>
        ))}
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        {displayKeywords.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
            No keywords in this category.
          </div>
        )}

        {/* Desktop table */}
        {displayKeywords.length > 0 && (
          <div className="hidden md:block bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-white select-none" onClick={() => toggleSort('keyword')}>
                    Keyword{sortIndicator('keyword')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium w-20">Source</th>
                  <th className="text-right px-4 py-3 font-medium w-28 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('volume')}>
                    Volume{sortIndicator('volume')}
                  </th>
                  <th className="text-right px-4 py-3 font-medium w-32 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('cpc')}>
                    CPC Range{sortIndicator('cpc')}
                  </th>
                  <th className="text-center px-4 py-3 font-medium w-20 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('comp')}>
                    Comp{sortIndicator('comp')}
                  </th>
                  <th className="text-center px-4 py-3 font-medium w-16">Trend</th>
                  <th className="text-center px-4 py-3 font-medium w-24 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('score')}>
                    {scoreView === 'ad' ? 'Ad Score' : 'SEO Score'}{sortIndicator('score')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayKeywords.map((kw, i) => (
                  <React.Fragment key={i}>
                    <tr
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer ${
                        expandedKeyword === kw.keyword ? 'bg-gray-800/40' : ''
                      }`}
                      onClick={() => setExpandedKeyword(expandedKeyword === kw.keyword ? null : kw.keyword)}
                    >
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
                    {expandedKeyword === kw.keyword && paid && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <KeywordPanel keyword={kw} relatedKeywords={getRelatedKeywords(kw)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {displayKeywords.length > 0 && (
          <div className="md:hidden space-y-2">
            {displayKeywords.map((kw, i) => (
              <div key={i}>
                <div
                  className={`bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer ${
                    expandedKeyword === kw.keyword ? 'border-jackpot-500/40' : ''
                  }`}
                  onClick={() => setExpandedKeyword(expandedKeyword === kw.keyword ? null : kw.keyword)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 mr-3">
                      <MaskedKeyword keyword={kw.keyword} paid={paid} />
                    </div>
                    <JackpotScore
                      score={scoreView === 'ad' ? kw.adScore : kw.seoScore}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs">Volume</span>
                      <div className="text-white font-mono">
                        {kw.avgMonthlySearches.toLocaleString()}/mo
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">CPC Range</span>
                      <div className="text-gray-300 font-mono">
                        ${kw.lowCpc.toFixed(2)}-${kw.highCpc.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs">Competition</span>
                      <div>
                        <span className={`text-xs font-medium ${
                          kw.competition === 'LOW' ? 'text-score-green' :
                          kw.competition === 'MEDIUM' ? 'text-score-yellow' :
                          'text-score-red'
                        }`}>
                          {kw.competition}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div>
                        <span className="text-gray-500 text-xs">Source</span>
                        <div><SourceBadge source={kw.source} /></div>
                      </div>
                      {kw.trendDirection && (
                        <TrendArrow direction={kw.trendDirection} info={kw.trendInfo} />
                      )}
                    </div>
                  </div>
                </div>
                {expandedKeyword === kw.keyword && paid && (
                  <KeywordPanel keyword={kw} relatedKeywords={getRelatedKeywords(kw)} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="text-center py-4">
            <button
              onClick={() => setVisibleCount((c) => c + 50)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2.5 rounded-lg text-sm transition"
            >
              Load more ({sortedKeywords.length - visibleCount} remaining)
            </button>
          </div>
        )}

        {/* Show locked count for free users */}
        {!paid && filteredKeywords.length > 3 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            ... and {filteredKeywords.length - 3} more keywords in this category
          </div>
        )}
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
