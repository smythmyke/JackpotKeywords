import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS } from '@jackpotkeywords/shared';
import type { KeywordCategory, KeywordResult, SearchResult } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { getSearchResult, refineSearch, saveAnonymousResult } from '../services/api';
import MaskedKeyword from '../components/MaskedKeyword';
import JackpotScore from '../components/JackpotScore';
import SourceBadge from '../components/SourceBadge';
import TrendArrow from '../components/TrendArrow';
import KeywordPanel from '../components/KeywordPanel';
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
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken, loading: authLoading, user, profile, signInWithGoogle } = useAuthContext();
  const isAnonymous = searchId === 'anonymous';
  const [savingAnonymous, setSavingAnonymous] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<KeywordCategory>('direct');
  const [scoreView, setScoreView] = useState<'ad' | 'seo'>('ad');
  const [sortCol, setSortCol] = useState<string>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  const toggleSelect = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeywords.size === displayKeywords.length) {
      // Deselect all visible
      setSelectedKeywords((prev) => {
        const next = new Set(prev);
        for (const kw of displayKeywords) next.delete(kw.keyword);
        return next;
      });
    } else {
      // Select all visible
      setSelectedKeywords((prev) => {
        const next = new Set(prev);
        for (const kw of displayKeywords) next.add(kw.keyword);
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedKeywords(new Set());

  const getSelectedResults = (): KeywordResult[] => {
    if (!result) return [];
    return result.keywords.filter((kw) => selectedKeywords.has(kw.keyword));
  };
  const [visibleCount, setVisibleCount] = useState(50);
  const [filterVolume, setFilterVolume] = useState<number | null>(null);
  const [filterCpc, setFilterCpc] = useState<number | null>(null);
  const [filterComp, setFilterComp] = useState<string | null>(null);
  const [filterTrend, setFilterTrend] = useState<string | null>(null);
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
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
    // Anonymous results — load from location state
    if (isAnonymous) {
      const stateResult = (location.state as any)?.result;
      if (stateResult) {
        setResult(stateResult);
        const firstWithData = ALL_CATEGORIES.find(
          (cat) => stateResult.keywords?.some((kw: KeywordResult) => kw.category === cat),
        );
        if (firstWithData) setActiveCategory(firstWithData);
      } else {
        setError('Results expired. Please run a new search.');
      }
      setLoading(false);
      return;
    }

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
  }, [searchId, getToken, authLoading, user, isAnonymous, location.state]);

  // When user signs in on anonymous page, save results and redirect
  useEffect(() => {
    if (!isAnonymous || !user || !result || savingAnonymous) return;

    async function saveAndRedirect() {
      setSavingAnonymous(true);
      try {
        const token = await getToken();
        if (!token) return;
        const { id } = await saveAnonymousResult(token, result!);
        navigate(`/results/${id}`, { replace: true });
      } catch (err: any) {
        console.error('Failed to save anonymous results:', err.message);
        setSavingAnonymous(false);
      }
    }
    saveAndRedirect();
  }, [isAnonymous, user, result, savingAnonymous, getToken, navigate]);

  if (loading || savingAnonymous) {
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

  const handleKeywordClick = (kw: KeywordResult) => {
    if (!paid && !isAdmin) {
      // Anonymous or free user — show sign-in/upgrade prompt
      setShowSignInPrompt(true);
      setTimeout(() => setShowSignInPrompt(false), 4000);
      return;
    }
    setExpandedKeyword(expandedKeyword === kw.keyword ? null : kw.keyword);
  };

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
  const displayKeywords = sortedKeywords.slice(0, visibleCount);
  const hasMore = visibleCount < sortedKeywords.length;

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
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Anonymous user banner */}
      {isAnonymous && (
        <div className="bg-jackpot-500/10 border border-jackpot-500/30 rounded-xl px-5 py-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-jackpot-400 font-medium">These results disappear on refresh.</span>
            <span className="text-gray-400 ml-1">Sign in to save them and unlock 3 free searches.</span>
          </div>
          <button
            onClick={signInWithGoogle}
            className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2 rounded-lg text-sm transition whitespace-nowrap"
          >
            Sign In to Save
          </button>
        </div>
      )}

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
                    const data = selectedKeywords.size > 0 ? getSelectedResults() : allKeywords;
                    exportAnalysisCsv(data, result.productLabel || 'keywords');
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition"
                >
                  <div className="font-medium">Export CSV</div>
                  <div className="text-xs text-gray-500">
                    {selectedKeywords.size > 0 ? `${selectedKeywords.size} selected keywords` : 'All keywords with metrics'}
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowAdsModal(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition border-t border-gray-700"
                >
                  <div className="font-medium">Export for Google Ads</div>
                  <div className="text-xs text-gray-500">
                    {selectedKeywords.size > 0 ? `${selectedKeywords.size} selected — Ads Editor format` : 'Google Ads Editor format (paused)'}
                  </div>
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

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl mb-3 flex-wrap">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mr-1">Filters</span>
        <select
          value={filterVolume ?? ''}
          onChange={(e) => { setFilterVolume(e.target.value ? Number(e.target.value) : null); setVisibleCount(50); }}
          className={`bg-gray-800 border rounded text-sm px-2 py-1.5 outline-none cursor-pointer ${filterVolume !== null ? 'border-jackpot-500 text-jackpot-400' : 'border-gray-700 text-gray-300'}`}
        >
          <option value="">Volume: Any</option>
          <option value="100">100+</option>
          <option value="500">500+</option>
          <option value="1000">1,000+</option>
          <option value="5000">5,000+</option>
          <option value="10000">10,000+</option>
        </select>
        <div className="w-px h-6 bg-gray-700" />
        <select
          value={filterCpc ?? ''}
          onChange={(e) => { setFilterCpc(e.target.value ? Number(e.target.value) : null); setVisibleCount(50); }}
          className={`bg-gray-800 border rounded text-sm px-2 py-1.5 outline-none cursor-pointer ${filterCpc !== null ? 'border-jackpot-500 text-jackpot-400' : 'border-gray-700 text-gray-300'}`}
        >
          <option value="">CPC: Any</option>
          <option value="1">Under $1</option>
          <option value="2">Under $2</option>
          <option value="5">Under $5</option>
          <option value="10">Under $10</option>
        </select>
        <div className="w-px h-6 bg-gray-700" />
        <select
          value={filterComp ?? ''}
          onChange={(e) => { setFilterComp(e.target.value || null); setVisibleCount(50); }}
          className={`bg-gray-800 border rounded text-sm px-2 py-1.5 outline-none cursor-pointer ${filterComp !== null ? 'border-jackpot-500 text-jackpot-400' : 'border-gray-700 text-gray-300'}`}
        >
          <option value="">Comp: Any</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
        </select>
        <div className="w-px h-6 bg-gray-700" />
        <select
          value={filterTrend ?? ''}
          onChange={(e) => { setFilterTrend(e.target.value || null); setVisibleCount(50); }}
          className={`bg-gray-800 border rounded text-sm px-2 py-1.5 outline-none cursor-pointer ${filterTrend !== null ? 'border-jackpot-500 text-jackpot-400' : 'border-gray-700 text-gray-300'}`}
        >
          <option value="">Trend: Any</option>
          <option value="rising">Rising</option>
          <option value="stable">Stable</option>
          <option value="declining">Declining</option>
        </select>
        <div className="w-px h-6 bg-gray-700" />
        <select
          value={filterScore ?? ''}
          onChange={(e) => { setFilterScore(e.target.value ? Number(e.target.value) : null); setVisibleCount(50); }}
          className={`bg-gray-800 border rounded text-sm px-2 py-1.5 outline-none cursor-pointer ${filterScore !== null ? 'border-jackpot-500 text-jackpot-400' : 'border-gray-700 text-gray-300'}`}
        >
          <option value="">Score: Any</option>
          <option value="80">80+</option>
          <option value="70">70+</option>
          <option value="60">60+</option>
          <option value="50">50+</option>
        </select>
        {activeFilterCount > 0 && (
          <button onClick={resetAll} className="ml-auto text-xs text-gray-500 hover:text-white transition">
            Clear all ({activeFilterCount} active)
          </button>
        )}
      </div>

      {/* Filter status */}
      {activeFilterCount > 0 && (
        <div className="text-sm text-gray-400 mb-2">
          Showing {filteredKeywords.length} of {categoryKeywords.length} keywords
          <span className="text-jackpot-400 ml-1">({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active)</span>
        </div>
      )}

      {/* Sign-in prompt toast */}
      {showSignInPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-jackpot-500/40 rounded-xl px-6 py-4 shadow-2xl flex items-center gap-4 animate-fade-in">
          <div className="text-sm">
            <span className="text-white font-medium">Sign in to unlock keyword details.</span>
            <span className="text-gray-400 ml-1">See charts, insights, and related keywords.</span>
          </div>
          {!user ? (
            <button
              onClick={signInWithGoogle}
              className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-4 py-2 rounded-lg text-sm transition whitespace-nowrap"
            >
              Sign In Free
            </button>
          ) : (
            <Link
              to="/pricing"
              className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-4 py-2 rounded-lg text-sm transition whitespace-nowrap"
            >
              Upgrade
            </Link>
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
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={displayKeywords.length > 0 && displayKeywords.every((kw) => selectedKeywords.has(kw.keyword))}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-jackpot-500 focus:ring-jackpot-500 cursor-pointer accent-amber-500"
                    />
                  </th>
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
                  <th className="text-center px-4 py-3 font-medium w-24">Trend</th>
                  <th className="text-center px-4 py-3 font-medium w-24 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('score')}>
                    {scoreView === 'ad' ? 'Ad Score' : 'SEO Score'}{sortIndicator('score')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayKeywords.map((kw, i) => (
                  <React.Fragment key={i}>
                    <tr
                      className={`border-b border-gray-800/50 cursor-pointer ${
                        (scoreView === 'ad' ? kw.adScore : kw.seoScore) >= 75
                          ? 'border-l-[3px] border-l-jackpot-500 jackpot-row hover:brightness-125'
                          : 'hover:bg-gray-800/30'
                      } ${expandedKeyword === kw.keyword ? 'bg-gray-800/40' : ''
                      } ${selectedKeywords.has(kw.keyword) ? '!bg-jackpot-500/[0.07]' : ''}`}
                      onClick={() => handleKeywordClick(kw)}
                    >
                      <td className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedKeywords.has(kw.keyword)}
                          onClick={(e) => toggleSelect(kw.keyword, e)}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-jackpot-500 focus:ring-jackpot-500 cursor-pointer accent-amber-500"
                        />
                      </td>
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
                        <td colSpan={8} className="p-0">
                          <KeywordPanel keyword={kw} relatedKeywords={getRelatedKeywords(kw)} selectedKeywords={selectedKeywords} onToggleSelect={(keyword) => setSelectedKeywords((prev) => { const next = new Set(prev); if (next.has(keyword)) next.delete(keyword); else next.add(keyword); return next; })} />
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
                  className={`bg-gray-900 border rounded-xl p-4 cursor-pointer ${
                    (scoreView === 'ad' ? kw.adScore : kw.seoScore) >= 75
                      ? 'border-l-[3px] border-l-jackpot-500 border-gray-800 jackpot-row'
                      : 'border-gray-800'
                  } ${expandedKeyword === kw.keyword ? 'border-jackpot-500/40' : ''}`}
                  onClick={() => handleKeywordClick(kw)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedKeywords.has(kw.keyword)}
                      onClick={(e) => toggleSelect(kw.keyword, e)}
                      onChange={() => {}}
                      className="w-4 h-4 mt-1 mr-3 rounded border-gray-600 bg-gray-800 cursor-pointer accent-amber-500 flex-shrink-0"
                    />
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
                  <KeywordPanel keyword={kw} relatedKeywords={getRelatedKeywords(kw)} selectedKeywords={selectedKeywords} onToggleSelect={(keyword) => setSelectedKeywords((prev) => { const next = new Set(prev); if (next.has(keyword)) next.delete(keyword); else next.add(keyword); return next; })} />
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

      </div>

      {/* Paywall CTA for free/anonymous users */}
      {!paid && !isAdmin && (
        <div className="mt-8 text-center bg-gradient-to-r from-jackpot-500/10 to-purple-500/10 border border-jackpot-500/20 rounded-xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">
            Unlock all {totalKeywords.toLocaleString()} keywords
          </h2>
          <p className="text-gray-400 mb-4">
            See every keyword, CPC, trend, and score. Export to CSV or Google Ads.
          </p>
          {!user ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={signInWithGoogle}
                className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition"
              >
                Sign In for 3 Free Searches
              </button>
              <span className="text-gray-500 text-sm">No credit card required</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/pricing" className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition">
                Unlock from $1.99
              </Link>
              <span className="text-gray-500">or</span>
              <Link to="/pricing" className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl transition">
                Go unlimited — $9.99/mo
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Selection action bar */}
      {selectedKeywords.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-jackpot-500/40 rounded-xl px-6 py-3 shadow-2xl flex items-center gap-4">
          <span className="text-sm text-white font-medium">
            {selectedKeywords.size} keyword{selectedKeywords.size !== 1 ? 's' : ''} selected
          </span>
          <div className="w-px h-6 bg-gray-700" />
          <button
            onClick={() => {
              exportAnalysisCsv(getSelectedResults(), result?.productLabel || 'selected');
            }}
            className="text-sm text-gray-300 hover:text-white transition"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowAdsModal(true)}
            className="text-sm text-gray-300 hover:text-white transition"
          >
            Export Google Ads
          </button>
          <div className="w-px h-6 bg-gray-700" />
          <button
            onClick={clearSelection}
            className="text-sm text-gray-500 hover:text-white transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Google Ads Export Modal */}
      {showAdsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdsModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full mx-4 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Export for Google Ads Editor</h3>
            <div className="space-y-3 text-sm text-gray-400 mb-6">
              <div className="flex gap-3">
                <span className="text-jackpot-400 font-bold">1.</span>
                <span>Download <span className="text-white">Google Ads Editor</span> (free) from Google</span>
              </div>
              <div className="flex gap-3">
                <span className="text-jackpot-400 font-bold">2.</span>
                <span>Open Ads Editor and sign in to your Google Ads account</span>
              </div>
              <div className="flex gap-3">
                <span className="text-jackpot-400 font-bold">3.</span>
                <span>Click <span className="text-white">Account &rarr; Import &rarr; From CSV</span> and select the file</span>
              </div>
              <div className="flex gap-3">
                <span className="text-jackpot-400 font-bold">4.</span>
                <span>Review keywords — all set to <span className="text-jackpot-400">paused</span> for safety</span>
              </div>
              <div className="flex gap-3">
                <span className="text-jackpot-400 font-bold">5.</span>
                <span>Set your budget, bidding strategy, and ad copy before enabling</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Link
                to="/help#google-ads-import"
                onClick={() => setShowAdsModal(false)}
                className="text-xs text-gray-500 hover:text-jackpot-400 transition"
              >
                Full instructions &rarr;
              </Link>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdsModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const data = selectedKeywords.size > 0 ? getSelectedResults() : allKeywords;
                    exportGoogleAdsCsv(data, result?.productLabel || 'Campaign');
                    setShowAdsModal(false);
                  }}
                  className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2 rounded-lg text-sm transition"
                >
                  Download CSV ({selectedKeywords.size > 0 ? selectedKeywords.size : totalKeywords} keywords)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline disclaimer */}
      <div className="mt-8 text-center text-xs text-gray-600">
        Data reflects conditions at time of search. Actual CPC and volume may vary.{' '}
        <Link to="/disclaimer" className="text-gray-500 hover:text-gray-400 underline">
          Full disclaimer
        </Link>
      </div>
    </div>
  );
}
