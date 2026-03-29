import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CATEGORY_LABELS } from '@jackpotkeywords/shared';
import type { KeywordCategory, KeywordResult, SearchResult } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { getSearchResult, refineSearch } from '../services/api';
import MaskedKeyword from '../components/MaskedKeyword';
import JackpotScore from '../components/JackpotScore';
import SourceBadge from '../components/SourceBadge';
import TrendArrow from '../components/TrendArrow';
import KeywordPanel from '../components/KeywordPanel';
import ColumnFilter from '../components/ColumnFilter';
import { exportAnalysisCsv, exportGoogleAdsCsv } from '../services/export';

const ALL_CATEGORIES: KeywordCategory[] = [
  'direct', 'feature', 'problem', 'audience', 'competitor_brand',
  'competitor_alt', 'use_case', 'niche', 'benefit', 'adjacent',
];

const REFINE_PLACEHOLDERS: Record<string, string> = {
  feature: 'Describe a feature, e.g., batch image processing...',
  problem: 'Describe a pain point, e.g., images load too slowly...',
  audience: 'Describe your target audience, e.g., etsy shop owners...',
  competitor_brand: 'Enter a competitor name, e.g., Canva...',
  competitor_alt: 'What are you an alternative to, e.g., Photoshop...',
  use_case: 'Describe a use case, e.g., creating social media posts...',
  niche: 'Enter an industry or niche, e.g., real estate...',
  benefit: 'Describe a benefit, e.g., saves time, increases sales...',
  adjacent: 'Enter a related topic, e.g., email marketing...',
};

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

export default function Results() {
  const { searchId } = useParams<{ searchId: string }>();
  const { getToken, loading: authLoading, user, profile } = useAuthContext();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<KeywordCategory>('direct');
  const [scoreView, setScoreView] = useState<'ad' | 'seo'>('ad');
  const [sortCol, setSortCol] = useState<string>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [filterVolume, setFilterVolume] = useState<number | null>(null);
  const [filterCpc, setFilterCpc] = useState<number | null>(null);
  const [filterComp, setFilterComp] = useState<string | null>(null);
  const [filterTrend, setFilterTrend] = useState<string | null>(null);
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeFilterCount = [filterVolume, filterCpc, filterComp, filterTrend, filterScore].filter((f) => f !== null).length;

  const clearAllFilters = () => {
    setFilterVolume(null);
    setFilterCpc(null);
    setFilterComp(null);
    setFilterTrend(null);
    setFilterScore(null);
  };

  const resetAll = () => {
    clearAllFilters();
    setSortCol('score');
    setSortDir('desc');
    setVisibleCount(50);
    setExpandedKeyword(null);
  };

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
    // Wait for auth to initialize before fetching
    if (authLoading) return;

    async function fetchResults() {
      if (!searchId) return;
      if (!user) {
        setError('Please sign in to view your results');
        setLoading(false);
        return;
      }
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
  }, [searchId, getToken, authLoading, user]);

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

  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);
  const userPlan = profile?.plan || 'free';
  const canRefine = isAdmin || userPlan === 'pro' || userPlan === 'agency';
  const refineCount = (result as any).refineCount || 0;
  const refinesRemaining = 5 - refineCount;
  const showRefineBar = canRefine && activeCategory !== 'direct' && refinesRemaining > 0;

  const handleRefine = async () => {
    if (!refineInput.trim() || !searchId || refining) return;
    setRefining(true);
    setRefineError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await refineSearch(token, searchId, refineInput.trim(), activeCategory);
      // Append new keywords to result
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          keywords: [...prev.keywords, ...res.keywords],
          refineCount: res.refineCount,
        } as any;
      });
      setRefineInput('');
    } catch (err: any) {
      setRefineError(err.message);
    } finally {
      setRefining(false);
    }
  };

  // Filter keywords by active category
  const categoryKeywords = allKeywords.filter((kw) => kw.category === activeCategory);

  // Apply column filters
  const filteredKeywords = categoryKeywords.filter((kw) => {
    if (filterVolume !== null && kw.avgMonthlySearches < filterVolume) return false;
    if (filterCpc !== null && kw.highCpc > filterCpc) return false;
    if (filterComp !== null && kw.competition !== filterComp) return false;
    if (filterTrend !== null) {
      if (filterTrend === 'rising' && kw.trendDirection !== 'rising' && kw.trendDirection !== 'rising_slight') return false;
      if (filterTrend === 'stable' && kw.trendDirection !== 'stable') return false;
      if (filterTrend === 'declining' && kw.trendDirection !== 'declining' && kw.trendDirection !== 'declining_slight') return false;
    }
    if (filterScore !== null) {
      const score = scoreView === 'ad' ? kw.adScore : kw.seoScore;
      if (score < filterScore) return false;
    }
    return true;
  });

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
  const displayKeywords = paid ? sortedKeywords.slice(0, visibleCount) : sortedKeywords.slice(0, 3);
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
            {(result.productLabel || result.query) && (
              <span>For &ldquo;{result.productLabel || result.query}&rdquo; &middot; </span>
            )}
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
          <Link
            to="/"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-jackpot-500 hover:bg-jackpot-600 text-black transition"
          >
            New Search
          </Link>
          <div className="relative" ref={exportRef}>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                paid
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!paid}
              title={paid ? 'Export' : 'Export available with Pro'}
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              Export {showExportMenu ? '\u25B2' : '\u25BC'}
            </button>
            {showExportMenu && paid && (
              <div className="absolute right-0 top-10 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px]">
                <button
                  onClick={() => {
                    exportAnalysisCsv(allKeywords, result.productLabel || 'keywords');
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition"
                >
                  <div className="font-medium">Export CSV</div>
                  <div className="text-xs text-gray-500">All keywords with metrics</div>
                </button>
                <button
                  onClick={() => {
                    exportGoogleAdsCsv(allKeywords, result.productLabel || 'Campaign');
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition border-t border-gray-700"
                >
                  <div className="font-medium">Export for Google Ads</div>
                  <div className="text-xs text-gray-500">Google Ads Editor format (paused)</div>
                </button>
              </div>
            )}
          </div>
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

      {/* Refine bar */}
      {showRefineBar && (
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              placeholder={REFINE_PLACEHOLDERS[activeCategory] || 'Add keywords...'}
              disabled={refining}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500 disabled:opacity-50"
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refineInput.trim()}
              className="bg-jackpot-500 hover:bg-jackpot-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium px-5 py-2.5 rounded-lg text-sm transition"
            >
              {refining ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-gray-600">
              Add keywords to {CATEGORY_LABELS[activeCategory]} &middot; {refinesRemaining} refinement{refinesRemaining !== 1 ? 's' : ''} remaining
            </span>
            {refineError && (
              <span className="text-xs text-red-400">{refineError}</span>
            )}
          </div>
        </div>
      )}

      {/* Filter status */}
      {(activeFilterCount > 0 || filteredKeywords.length !== categoryKeywords.length) && (
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-gray-400">
            Showing {filteredKeywords.length} of {categoryKeywords.length} keywords
            {activeFilterCount > 0 && (
              <span className="text-jackpot-400 ml-1">({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active)</span>
            )}
          </span>
          {activeFilterCount > 0 && (
            <div className="flex gap-3">
              <button onClick={clearAllFilters} className="text-gray-500 hover:text-white text-xs transition">
                Clear filters
              </button>
              <button onClick={resetAll} className="text-gray-500 hover:text-white text-xs transition">
                Reset all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      <div className="space-y-2">
        {displayKeywords.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
            {activeFilterCount > 0 ? 'No keywords match your filters.' : 'No keywords in this category.'}
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
                  <th className="text-right px-4 py-3 font-medium w-32 select-none">
                    <span className="cursor-pointer hover:text-white" onClick={() => toggleSort('volume')}>Volume{sortIndicator('volume')}</span>
                    <ColumnFilter
                      value={filterVolume}
                      onChange={(v) => { setFilterVolume(v as number | null); setVisibleCount(50); }}
                      options={[
                        { label: '100+', value: 100 },
                        { label: '500+', value: 500 },
                        { label: '1,000+', value: 1000 },
                        { label: '5,000+', value: 5000 },
                        { label: '10,000+', value: 10000 },
                      ]}
                      customPlaceholder="Min vol"
                    />
                  </th>
                  <th className="text-right px-4 py-3 font-medium w-36 select-none">
                    <span className="cursor-pointer hover:text-white" onClick={() => toggleSort('cpc')}>CPC Range{sortIndicator('cpc')}</span>
                    <ColumnFilter
                      value={filterCpc}
                      onChange={(v) => { setFilterCpc(v as number | null); setVisibleCount(50); }}
                      options={[
                        { label: 'Under $1', value: 1 },
                        { label: 'Under $2', value: 2 },
                        { label: 'Under $5', value: 5 },
                        { label: 'Under $10', value: 10 },
                      ]}
                      type="max"
                      customPlaceholder="Max CPC"
                    />
                  </th>
                  <th className="text-center px-4 py-3 font-medium w-24 select-none">
                    <span className="cursor-pointer hover:text-white" onClick={() => toggleSort('comp')}>Comp{sortIndicator('comp')}</span>
                    <ColumnFilter
                      value={filterComp}
                      onChange={(v) => { setFilterComp(v as string | null); setVisibleCount(50); }}
                      options={[
                        { label: 'LOW', value: 'LOW' },
                        { label: 'MEDIUM', value: 'MEDIUM' },
                        { label: 'HIGH', value: 'HIGH' },
                      ]}
                      type="select"
                    />
                  </th>
                  <th className="text-center px-4 py-3 font-medium w-20 select-none">
                    Trend
                    <ColumnFilter
                      value={filterTrend}
                      onChange={(v) => { setFilterTrend(v as string | null); setVisibleCount(50); }}
                      options={[
                        { label: 'Rising', value: 'rising' },
                        { label: 'Stable', value: 'stable' },
                        { label: 'Declining', value: 'declining' },
                      ]}
                      type="select"
                    />
                  </th>
                  <th className="text-center px-4 py-3 font-medium w-28 select-none">
                    <span className="cursor-pointer hover:text-white" onClick={() => toggleSort('score')}>
                      {scoreView === 'ad' ? 'Ad Score' : 'SEO Score'}{sortIndicator('score')}
                    </span>
                    <ColumnFilter
                      value={filterScore}
                      onChange={(v) => { setFilterScore(v as number | null); setVisibleCount(50); }}
                      options={[
                        { label: '80+', value: 80 },
                        { label: '70+', value: 70 },
                        { label: '60+', value: 60 },
                        { label: '50+', value: 50 },
                      ]}
                      customPlaceholder="Min score"
                    />
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
        {!paid && categoryKeywords.length > 3 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            ... and {categoryKeywords.length - 3} more keywords in this category
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
