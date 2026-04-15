import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS, INTENT_LABELS } from '@jackpotkeywords/shared';
import type { KeywordCategory, KeywordResult, SearchResult, SearchIntent, KeywordCluster } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { getSearchResult, refineSearch, claimSearch, saveSearch, nameClusters, scoreKeywordRelevance, expandResults } from '../services/api';
import MaskedKeyword from '../components/MaskedKeyword';
import JackpotScore from '../components/JackpotScore';
import SourceBadge from '../components/SourceBadge';
import TrendArrow from '../components/TrendArrow';
import KeywordPanel from '../components/KeywordPanel';
import MarketIntelligence from '../components/MarketIntelligence';
import BudgetCalculator from '../components/BudgetCalculator';
import IntentBadge from '../components/IntentBadge';
import ConversionModal, { type ConversionModalVariant } from '../components/ConversionModal';
import { computeModalMetrics, computeTopThree } from '../lib/modalMetrics';
import { exportAnalysisCsv, exportGoogleAdsCsv } from '../services/export';
import {
  trackConversionModalShown,
  trackConversionModalCta,
  trackConversionModalDismissed,
} from '../services/analytics';
import { trackEvent } from '../lib/analytics';

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
  const { getToken, loading: authLoading, user, profile, credits, signInWithGoogle } = useAuthContext();
  const isAnonymous = searchId === 'anonymous';
  const [result, setResult] = useState<SearchResult | null>(null);
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  // Tracks which trigger caused the modal to open, for analytics
  const modalTriggerRef = useRef<'scroll' | 'masked_click' | null>(null);
  // Prevents double-firing the shown analytics event for one open cycle
  const modalShownFiredRef = useRef(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [relevanceLoading, setRelevanceLoading] = useState(false);
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
  const [filterIntent, setFilterIntent] = useState<SearchIntent | null>(null);
  const [filterRelevance, setFilterRelevance] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'keywords' | 'clusters'>('keywords');
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAdsModal, setShowAdsModal] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [expandedCount, setExpandedCount] = useState<number | null>(null);
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

  const activeFilterCount = [filterVolume, filterCpc, filterComp, filterTrend, filterScore, filterIntent, filterRelevance].filter((f) => f !== null).length;

  const clearAllFilters = () => {
    setFilterVolume(null);
    setFilterCpc(null);
    setFilterComp(null);
    setFilterTrend(null);
    setFilterScore(null);
    setFilterIntent(null);
    setFilterRelevance(null);
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
    const stateResult = (location.state as any)?.result;
    const stateMaxCpc = (location.state as any)?.maxCpc;
    // Check for results passed via location state
    if (stateResult && (!result || result.id !== stateResult.id || result.paid !== stateResult.paid)) {
      setResult(stateResult);
      if (stateMaxCpc) setFilterCpc(stateMaxCpc);
      try {
        sessionStorage.setItem('jk_results', JSON.stringify(stateResult));
        sessionStorage.setItem('jk_results_path', location.pathname);
        if (stateMaxCpc) sessionStorage.setItem('jk_maxCpc', String(stateMaxCpc));
      } catch {}
      const firstWithData = ALL_CATEGORIES.find(
        (cat) => stateResult.keywords?.some((kw: KeywordResult) => kw.category === cat),
      );
      if (firstWithData) setActiveCategory(firstWithData);
      setLoading(false);
      return;
    }

    // If we already have results loaded, don't re-fetch on auth changes
    if (result) return;

    // Try restoring from sessionStorage
    if (isAnonymous) {
      try {
        const cached = sessionStorage.getItem('jk_results');
        if (cached) {
          const parsed = JSON.parse(cached);
          setResult(parsed);
          const savedMaxCpc = sessionStorage.getItem('jk_maxCpc');
          if (savedMaxCpc) setFilterCpc(Number(savedMaxCpc));
          const firstWithData = ALL_CATEGORIES.find(
            (cat) => parsed.keywords?.some((kw: KeywordResult) => kw.category === cat),
          );
          if (firstWithData) setActiveCategory(firstWithData);
          setLoading(false);
          return;
        }
      } catch {}
      setError('Results expired. Please run a new search.');
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
        try {
          sessionStorage.setItem('jk_results', JSON.stringify(data));
          sessionStorage.setItem('jk_results_path', location.pathname);
        } catch {}

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
  }, [searchId, getToken, authLoading, user, isAnonymous, location.state, result]);

  // When anonymous user signs in, re-fetch unmasked data from global collection
  // The anonymous response has server-masked keyword strings (••• locked N),
  // so we must re-fetch the full unmasked result using the search ID.
  const [claimed, setClaimed] = useState(false);
  useEffect(() => {
    if (!isAnonymous || !user || !result || claimed) return;

    // Wait for profile to load so we know if admin/pro
    if (!profile) return;

    const isAdminOrSub = (profile.email && ADMIN_EMAILS.includes(profile.email)) ||
      profile.plan === 'pro' || profile.plan === 'agency';

    async function refetchUnmasked() {
      setClaimed(true);
      console.log('[Results] User signed in, re-fetching unmasked data for:', result!.id);
      try {
        const token = await getToken();
        if (!token) {
          console.error('[Results] No token available after login');
          return;
        }
        // Re-fetch from backend — returns unmasked data with paid=true
        const data = await getSearchResult(token, result!.id);
        console.log('[Results] Re-fetch success, keywords:', data.keywords?.length);
        setResult(data);
        try {
          sessionStorage.setItem('jk_results', JSON.stringify(data));
        } catch {}
      } catch (err: any) {
        console.error('[Results] Re-fetch failed:', err.message);
        // If re-fetch fails for admin/pro, they already see unblurred via paid flag
        // For free users, fall back to claim flow
        if (!isAdminOrSub) {
          try {
            const token = await getToken();
            if (!token) return;
            const { paid: claimedPaid } = await claimSearch(token);
            setResult((prev) => prev ? { ...prev, paid: claimedPaid } : prev);
          } catch (claimErr: any) {
            console.error('[Results] Claim also failed:', claimErr.message);
            if (claimErr.message?.toLowerCase().includes('run a new search')) {
              alert('To see full results with your credits, please run the search again while signed in.');
            }
          }
        }
      }
    }
    refetchUnmasked();
  }, [isAnonymous, user, result, profile, claimed, getToken]);

  // Background cluster naming — runs after keywords display
  useEffect(() => {
    if (!result?.clusters || result.clusters.length === 0) return;
    if (result.clusters[0]?.name && !result.clusters[0].name.startsWith('Cluster ')) return;

    setClustersLoading(true);
    nameClusters(result.clusters).then(({ clusters: named }) => {
      setResult((prev) => prev ? { ...prev, clusters: named } : prev);
    }).catch((err) => {
      console.error('Cluster naming failed:', err.message);
    }).finally(() => {
      setClustersLoading(false);
    });
  }, [result?.clusters?.length]);

  // Background relevance scoring — runs after keywords display
  useEffect(() => {
    if (!result?.keywords || result.keywords.length === 0) return;
    const ctx = (result as any).productContext;
    if (!ctx) return;
    // Skip if keywords already have relevance scores
    if (result.keywords[0]?.aiRelevance !== undefined) return;

    setRelevanceLoading(true);
    const top200 = result.keywords.slice(0, 200).map((k) => k.keyword);
    scoreKeywordRelevance(top200, ctx).then(({ scores }) => {
      setResult((prev) => {
        if (!prev) return prev;
        const updated = prev.keywords.map((kw) => {
          const score = scores[kw.keyword];
          return score !== undefined ? { ...kw, aiRelevance: score } : kw;
        });
        return { ...prev, keywords: updated };
      });
    }).catch((err) => {
      console.error('Relevance scoring failed:', err.message);
    }).finally(() => {
      setRelevanceLoading(false);
    });
  }, [result?.keywords?.length]);

  // Save handler — saves selected keywords to Firestore
  const handleSaveSearch = async () => {
    if (!result || !user || selectedKeywords.size === 0) return;
    if (selectedKeywords.size > 200) {
      setError('Save up to 200 keywords. Use filters to narrow down your best keywords.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const selectedKws = result.keywords.filter((kw) => selectedKeywords.has(kw.keyword));
      const savedClusters = result.clusters?.filter((c) =>
        c.keywordKeys.some((k) => selectedKeywords.has(k))
      ).map((c) => ({
        ...c,
        keywordKeys: c.keywordKeys.filter((k) => selectedKeywords.has(k)),
      }));
      const { id } = await saveSearch(token, {
        query: result.query,
        productLabel: result.productLabel,
        url: result.url,
        budget: result.budget,
        keywords: selectedKws,
        categories: result.categories,
        clusters: savedClusters,
        metadata: result.metadata,
      });
      setIsSaved(true);
      window.history.replaceState(null, '', `/results/${id}`);
    } catch (err: any) {
      setError('Failed to save search: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ----- Conversion modal: metrics, dismissal persistence, trigger -----
  const modalMetrics = useMemo(
    () => computeModalMetrics(result?.keywords || []),
    [result?.keywords],
  );
  const modalTopThree = useMemo(
    () => computeTopThree(result?.keywords || []),
    [result?.keywords],
  );

  // Read dismissed state from localStorage when the search changes
  useEffect(() => {
    if (!result?.id) return;
    try {
      const seen = localStorage.getItem('jk_modal_seen_' + result.id) === '1';
      setModalDismissed(seen);
    } catch {
      setModalDismissed(false);
    }
  }, [result?.id]);

  // Fire the "modal shown" analytics event when the modal opens.
  // Guarded by a ref so re-renders (e.g. credits refresh) don't re-fire it.
  useEffect(() => {
    if (!conversionModalOpen) {
      modalShownFiredRef.current = false;
      return;
    }
    if (modalShownFiredRef.current) return;
    modalShownFiredRef.current = true;
    const _variant: ConversionModalVariant = !user
      ? 'anonymous'
      : credits && credits.freeSearchesUsed >= 2
        ? 'lastFreeSearch'
        : 'free';
    trackConversionModalShown(
      _variant,
      modalTriggerRef.current || 'scroll',
      modalMetrics.jackpots,
      modalMetrics.totalKeywords,
    );
  }, [conversionModalOpen, user, credits, modalMetrics.jackpots, modalMetrics.totalKeywords]);

  // Scroll-depth trigger. Watches paid/isAdmin inline because the hoisted
  // `paid` constant lives after the early returns below.
  useEffect(() => {
    if (!result || modalDismissed || conversionModalOpen) return;
    const _isAdmin = !!(profile?.email && ADMIN_EMAILS.includes(profile.email));
    const _plan = profile?.plan || 'free';
    const _paid = !!(result.paid || _isAdmin || _plan === 'pro' || _plan === 'agency');
    if (_paid) return;
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      if (window.scrollY > 600) {
        fired = true;
        modalTriggerRef.current = 'scroll';
        setConversionModalOpen(true);
        trackEvent('paywall_viewed', { source: 'scroll' });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [result, modalDismissed, conversionModalOpen, profile]);

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

  const allKeywords = result.keywords || [];
  const totalKeywords = allKeywords.length;

  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);
  const userPlan = profile?.plan || 'free';
  const paid = result.paid || isAdmin || userPlan === 'pro' || userPlan === 'agency';
  const canRefine = isAdmin || userPlan === 'pro' || userPlan === 'agency';
  const refineCount = (result as any).refineCount || 0;
  const refinesRemaining = 5 - refineCount;
  const showRefineBar = isSaved && canRefine && activeCategory !== 'direct' && refinesRemaining > 0;

  // Conversion modal variant (anonymous vs free vs last-free-search)
  const modalVariant: ConversionModalVariant = !user
    ? 'anonymous'
    : credits && credits.freeSearchesUsed >= 2
      ? 'lastFreeSearch'
      : 'free';

  const markModalSeen = () => {
    if (result?.id) {
      try {
        localStorage.setItem('jk_modal_seen_' + result.id, '1');
      } catch {}
      setModalDismissed(true);
    }
  };

  const handleModalClose = () => {
    trackConversionModalDismissed(modalVariant);
    setConversionModalOpen(false);
    markModalSeen();
  };

  const handleModalCta = () => {
    trackConversionModalCta(modalVariant);
    trackEvent('upgrade_clicked', { source: 'conversion_modal', variant: modalVariant });
    markModalSeen();
    setConversionModalOpen(false);
    if (modalVariant === 'anonymous') {
      trackEvent('signin_prompted', { trigger: 'conversion_modal_cta' });
      signInWithGoogle();
    } else {
      navigate('/pricing');
    }
  };

  const handleKeywordClick = (kw: KeywordResult) => {
    if (!paid && !isAdmin) {
      // First time a free/anonymous user clicks a masked row: open the
      // conversion modal instead of the sign-in toast. After the modal has
      // been dismissed for this search, fall back to the toast.
      if (!modalDismissed && !conversionModalOpen) {
        modalTriggerRef.current = 'masked_click';
        setConversionModalOpen(true);
        trackEvent('paywall_viewed', { source: 'masked_click', authed: !!user });
        return;
      }
      setShowSignInPrompt(true);
      setTimeout(() => setShowSignInPrompt(false), 4000);
      trackEvent('signin_prompted', { trigger: 'masked_click_repeat' });
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

  const handleExpand = async () => {
    if (!result || expanding || expandedCount !== null) return;
    setExpanding(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sign in to expand results');

      // Get top seeds from direct category sorted by score
      const topSeeds = result.keywords
        .filter((kw) => kw.category === 'direct')
        .sort((a, b) => b.adScore - a.adScore)
        .slice(0, 8)
        .map((kw) => kw.keyword);

      if (topSeeds.length === 0) {
        // Fallback: use any top keywords
        topSeeds.push(...result.keywords
          .sort((a, b) => b.adScore - a.adScore)
          .slice(0, 8)
          .map((kw) => kw.keyword));
      }

      const res = await expandResults(token, {
        topSeeds,
        existingKeywords: result.keywords.map((kw) => kw.keyword),
        productContext: result.productContext || { productLabel: result.productLabel, whatItDoes: result.query, industryNiche: [], keyFeatures: [] },
        budget: result.budget,
      });

      if (res.keywords.length > 0) {
        setResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            keywords: [...prev.keywords, ...res.keywords],
            clusters: [...(prev.clusters || []), ...res.clusters],
            expandedAt: new Date().toISOString(),
          } as any;
        });
      }
      setExpandedCount(res.expandedCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExpanding(false);
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
    if (filterIntent !== null && kw.intent !== filterIntent) return false;
    if (filterRelevance !== null) {
      if (kw.aiRelevance === undefined) return false;
      if (kw.aiRelevance < filterRelevance) return false;
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
      case 'intent': av = a.intent || ''; bv = b.intent || ''; break;
      case 'relevance': av = a.aiRelevance ?? -1; bv = b.aiRelevance ?? -1; break;
      case 'score': av = scoreView === 'ad' ? a.adScore : a.seoScore; bv = scoreView === 'ad' ? b.adScore : b.seoScore; break;
      default: av = scoreView === 'ad' ? a.adScore : a.seoScore; bv = scoreView === 'ad' ? b.adScore : b.seoScore;
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Category counts (total and filtered)
  const categoryCounts: Record<string, number> = {};
  const categoryFilteredCounts: Record<string, number> = {};
  const hasActiveFilters = activeFilterCount > 0;
  ALL_CATEGORIES.forEach((c) => {
    const catKws = allKeywords.filter((kw) => kw.category === c);
    categoryCounts[c] = catKws.length;
    if (hasActiveFilters) {
      categoryFilteredCounts[c] = catKws.filter((kw) => {
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
        if (filterIntent !== null && kw.intent !== filterIntent) return false;
        if (filterRelevance !== null) {
          if (kw.aiRelevance === undefined) return false;
          if (kw.aiRelevance < filterRelevance) return false;
        }
        return true;
      }).length;
    }
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
      {/* Sticky upgrade CTA — unpaid users see all N keywords teased, paywall messaging above */}
      {!paid && !isAdmin && (
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 mb-4 bg-gradient-to-r from-jackpot-500/20 via-jackpot-500/15 to-jackpot-500/20 border-b border-jackpot-500/40 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-white">
            <span className="font-semibold text-jackpot-400">Unlock all {totalKeywords.toLocaleString()} keywords</span>
            <span className="text-gray-300 ml-1">— including the top jackpot-tier picks. Pro is $9.99/mo, single searches from $1.99.</span>
          </div>
          <button
            onClick={() => {
              trackEvent('upgrade_clicked', { source: 'results_sticky_bar' });
              navigate('/pricing');
            }}
            className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2 rounded-lg text-sm transition whitespace-nowrap"
          >
            Unlock all keywords
          </button>
        </div>
      )}

      {/* Anonymous user banner */}
      {isAnonymous && !user && (
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
          {result.clusters && result.clusters.length > 0 && (
            <div className="flex bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('keywords')}
                className={`px-3 py-1.5 rounded-md text-sm transition ${
                  viewMode === 'keywords'
                    ? 'bg-jackpot-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Keywords
              </button>
              <button
                onClick={() => !clustersLoading && setViewMode('clusters')}
                disabled={clustersLoading}
                className={`px-3 py-1.5 rounded-md text-sm transition ${
                  clustersLoading
                    ? 'text-gray-600 opacity-40 cursor-wait'
                    : viewMode === 'clusters'
                    ? 'bg-jackpot-500 text-black font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {clustersLoading ? 'Clusters...' : 'Clusters'}
              </button>
            </div>
          )}
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

      {/* Market Intelligence Dashboard */}
      <MarketIntelligence keywords={allKeywords} productLabel={result.productLabel} />
      <BudgetCalculator
        keywords={allKeywords}
        selectedKeywords={selectedKeywords}
        paid={paid}
        user={user}
        profile={profile}
        signInWithGoogle={signInWithGoogle}
        getToken={getToken}
      />

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setVisibleCount(50); setExpandedKeyword(null); }}
            className={`px-3 py-2.5 rounded-lg text-sm transition text-left ${
              activeCategory === cat
                ? 'bg-jackpot-500/15 text-jackpot-400 border border-jackpot-500/40 font-medium'
                : hasActiveFilters && categoryFilteredCounts[cat] === 0
                  ? 'bg-gray-900 text-gray-500 border border-gray-800 opacity-40'
                  : hasActiveFilters && categoryFilteredCounts[cat] > 0
                    ? 'bg-gray-900 text-gray-300 border border-jackpot-500/40 hover:border-jackpot-500/60'
                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700 hover:text-gray-300'
            }`}
          >
            <div className="truncate">{CATEGORY_LABELS[cat]}</div>
            <div className="text-xs opacity-60 mt-0.5">
              {hasActiveFilters ? (
                <span className={categoryFilteredCounts[cat] === 0 ? 'text-gray-600' : ''}>
                  <span className={categoryFilteredCounts[cat] > 0 ? 'text-jackpot-400 font-medium opacity-100' : ''}>{categoryFilteredCounts[cat]}</span>
                  {' '}of {categoryCounts[cat]}
                </span>
              ) : (
                <span>{categoryCounts[cat]} keywords</span>
              )}
              {result.clusters && result.clusters.filter((c) => c.category === cat).length > 0 && (
                <span> &middot; {result.clusters.filter((c) => c.category === cat).length} clusters</span>
              )}
            </div>
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

      {/* Filter bar — sticky */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl mb-3 flex-wrap shadow-lg">
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
          <option value="0.5">Under $0.50</option>
          <option value="1">Under $1</option>
          <option value="2">Under $2</option>
          <option value="5">Under $5</option>
          <option value="10">Under $10</option>
          {filterCpc !== null && ![0.5, 1, 2, 5, 10].includes(filterCpc) && (
            <option value={filterCpc}>Under ${filterCpc.toFixed(2)}</option>
          )}
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
        <div className="w-px h-6 bg-gray-700" />
        <select
          value={filterIntent ?? ''}
          onChange={(e) => { setFilterIntent(e.target.value ? e.target.value as SearchIntent : null); setVisibleCount(50); }}
          className={`bg-gray-800 border rounded text-sm px-2 py-1.5 outline-none cursor-pointer ${filterIntent !== null ? 'border-jackpot-500 text-jackpot-400' : 'border-gray-700 text-gray-300'}`}
        >
          <option value="">Intent: Any</option>
          <option value="commercial">Commercial</option>
          <option value="transactional">Transactional</option>
          <option value="informational">Informational</option>
          <option value="navigational">Navigational</option>
        </select>
        <div className="w-px h-6 bg-gray-700" />
        <select
          value={filterRelevance ?? ''}
          onChange={(e) => { setFilterRelevance(e.target.value ? Number(e.target.value) : null); setVisibleCount(50); }}
          className={`bg-gray-800 border rounded text-sm px-2 py-1.5 outline-none cursor-pointer ${filterRelevance !== null ? 'border-jackpot-500 text-jackpot-400' : 'border-gray-700 text-gray-300'}`}
        >
          <option value="">Rel: Any</option>
          <option value="8">8+</option>
          <option value="6">6+</option>
          <option value="4">4+</option>
          <option value="1">Scored</option>
        </select>
        {activeFilterCount > 0 && (
          <button onClick={resetAll} className="text-xs text-gray-500 hover:text-white transition">
            Clear all ({activeFilterCount} active)
          </button>
        )}

        {/* Expand Results button */}
        <button
          onClick={handleExpand}
          disabled={expanding || expandedCount !== null || !paid}
          title={!paid ? 'Expand is available for paid users' : expandedCount !== null ? `Expanded +${expandedCount}` : 'Discover keywords from YouTube, Amazon & eBay'}
          className={`ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold border-2 transition whitespace-nowrap ${
            expandedCount !== null
              ? 'border-green-500/40 bg-green-500/8 text-green-400 opacity-70 cursor-default'
              : expanding
              ? 'border-amber-500/40 bg-amber-500/8 text-amber-400 cursor-wait opacity-80'
              : !paid
              ? 'border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed'
              : 'border-red-500 bg-red-500/8 text-red-400 hover:bg-red-500/15 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]'
          }`}
        >
          {expandedCount !== null ? (
            <>&#10003; Expanded +{expandedCount}</>
          ) : expanding ? (
            <><span className="inline-block w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> Expanding...</>
          ) : (
            <><span className="text-base">&#9889;</span> Expand Results</>
          )}
        </button>
      </div>

      {/* Filter status */}
      {activeFilterCount > 0 && (
        <div className="text-sm text-gray-400 mb-2">
          Showing {filteredKeywords.length} of {categoryKeywords.length} keywords
          <span className="text-jackpot-400 ml-1">({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active)</span>
        </div>
      )}

      {/* Conversion modal (first-time push for non-paying users) */}
      {!paid && !isAdmin && (
        <ConversionModal
          open={conversionModalOpen}
          onClose={handleModalClose}
          onCta={handleModalCta}
          variant={modalVariant}
          metrics={modalMetrics}
          topThree={modalTopThree}
        />
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

      {/* Cluster View */}
      {viewMode === 'clusters' && result.clusters && (
        <div className="space-y-3">
          {(() => {
            const categoryClusters = result.clusters
              .filter((c) => c.category === activeCategory)
              .map((cluster) => {
                // Get keywords for this cluster and apply filters
                const clusterKws = allKeywords.filter(
                  (kw) => cluster.keywordKeys.includes(kw.keyword) && kw.category === activeCategory,
                );
                const filtered = clusterKws.filter((kw) => {
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
                  if (filterIntent !== null && kw.intent !== filterIntent) return false;
                  return true;
                });
                const sorted = [...filtered].sort((a, b) => {
                  const av = scoreView === 'ad' ? a.adScore : a.seoScore;
                  const bv = scoreView === 'ad' ? b.adScore : b.seoScore;
                  return bv - av;
                });
                const totalVol = filtered.reduce((s, k) => s + k.avgMonthlySearches, 0);
                const avgCpc = filtered.length > 0
                  ? filtered.reduce((s, k) => s + (k.lowCpc + k.highCpc) / 2, 0) / filtered.length
                  : 0;
                const bestScore = filtered.length > 0
                  ? Math.max(...filtered.map((k) => scoreView === 'ad' ? k.adScore : k.seoScore))
                  : 0;
                return { cluster, keywords: sorted, totalVol, avgCpc, bestScore, visibleCount: filtered.length };
              })
              .filter((c) => c.visibleCount > 0)
              .sort((a, b) => {
                // Jackpot clusters first, then by best score
                if (a.cluster.isJackpot !== b.cluster.isJackpot) return a.cluster.isJackpot ? -1 : 1;
                return b.bestScore - a.bestScore;
              });

            if (categoryClusters.length === 0) {
              return (
                <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
                  {activeFilterCount > 0 ? 'No clusters match your filters.' : 'No clusters in this category.'}
                </div>
              );
            }

            const isExpanded = (id: string) => expandedClusters.has(id);
            const toggleCluster = (id: string) => {
              setExpandedClusters((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            };
            const toggleClusterSelect = (keywords: KeywordResult[]) => {
              const kwNames = keywords.map((k) => k.keyword);
              const allSelected = kwNames.every((k) => selectedKeywords.has(k));
              setSelectedKeywords((prev) => {
                const next = new Set(prev);
                for (const k of kwNames) {
                  if (allSelected) next.delete(k);
                  else next.add(k);
                }
                return next;
              });
            };

            return categoryClusters.map(({ cluster, keywords: clusterKws, totalVol, avgCpc, bestScore }) => (
              <div
                key={cluster.id}
                className={`bg-gray-900 border rounded-xl overflow-hidden ${
                  cluster.isJackpot
                    ? 'border-l-[3px] border-l-jackpot-500 border-gray-800'
                    : 'border-gray-800'
                }`}
              >
                {/* Cluster header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition ${
                    cluster.isJackpot ? 'bg-gradient-to-r from-jackpot-500/[0.04] to-transparent' : ''
                  }`}
                  onClick={() => toggleCluster(cluster.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={clusterKws.length > 0 && clusterKws.every((k) => selectedKeywords.has(k.keyword))}
                      onClick={(e) => { e.stopPropagation(); toggleClusterSelect(clusterKws); }}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 cursor-pointer accent-amber-500 flex-shrink-0"
                    />
                    <span className="font-semibold text-white text-sm truncate">{cluster.name}</span>
                    <span className="text-[11px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full flex-shrink-0">
                      {clusterKws.length} keywords
                    </span>
                    {cluster.dominantIntent && <IntentBadge intent={cluster.dominantIntent} />}
                  </div>
                  <div className="flex items-center gap-5 text-xs text-gray-400 flex-shrink-0 ml-4">
                    <div className="hidden sm:block">Vol: <span className="text-white font-medium font-mono">{totalVol.toLocaleString()}/mo</span></div>
                    <div className="hidden sm:block">CPC: <span className="text-white font-medium font-mono">${avgCpc.toFixed(2)}</span></div>
                    <JackpotScore score={bestScore} size="sm" />
                    <span className={`text-lg transition-transform ${isExpanded(cluster.id) ? 'rotate-180' : ''}`}>
                      &#9660;
                    </span>
                  </div>
                </div>

                {/* Expanded cluster body */}
                {isExpanded(cluster.id) && (
                  <div className="border-t border-gray-800">
                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500">
                            <th className="w-10 px-3 py-2"><input type="checkbox" checked={clusterKws.every((k) => selectedKeywords.has(k.keyword))} onChange={() => toggleClusterSelect(clusterKws)} className="w-4 h-4 rounded border-gray-600 bg-gray-800 cursor-pointer accent-amber-500" /></th>
                            <th className="text-left px-4 py-2 font-medium text-xs">Keyword</th>
                            <th className="text-center px-3 py-2 font-medium text-xs w-16">Intent</th>
                            <th className="text-right px-4 py-2 font-medium text-xs w-24">Volume</th>
                            <th className="text-right px-4 py-2 font-medium text-xs w-28">CPC Range</th>
                            <th className="text-center px-3 py-2 font-medium text-xs w-16">Comp</th>
                            <th className="text-center px-3 py-2 font-medium text-xs w-20">Trend</th>
                            <th className="text-center px-3 py-2 font-medium text-xs w-20">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clusterKws.map((kw, i) => (
                            <tr
                              key={i}
                              className={`border-b border-gray-800/30 hover:bg-gray-800/30 ${
                                (scoreView === 'ad' ? kw.adScore : kw.seoScore) >= 75
                                  ? 'border-l-[3px] border-l-jackpot-500 jackpot-row'
                                  : ''
                              } ${selectedKeywords.has(kw.keyword) ? '!bg-jackpot-500/[0.07]' : ''}`}
                            >
                              <td className="w-10 px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedKeywords.has(kw.keyword)}
                                  onClick={(e) => toggleSelect(kw.keyword, e)}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 cursor-pointer accent-amber-500"
                                />
                              </td>
                              <td className="px-4 py-2"><MaskedKeyword keyword={kw.keyword} paid={paid} /></td>
                              <td className="px-3 py-2 text-center">{kw.intent && <IntentBadge intent={kw.intent} />}</td>
                              <td className="px-4 py-2 text-right text-white font-mono text-xs">{kw.avgMonthlySearches.toLocaleString()}/mo</td>
                              <td className="px-4 py-2 text-right text-gray-300 font-mono text-xs">${kw.lowCpc.toFixed(2)}-${kw.highCpc.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`text-xs font-medium ${kw.competition === 'LOW' ? 'text-score-green' : kw.competition === 'MEDIUM' ? 'text-score-yellow' : 'text-score-red'}`}>{kw.competition}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {kw.trendDirection ? <TrendArrow direction={kw.trendDirection} info={kw.trendInfo} /> : <span className="text-gray-600">-</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <JackpotScore score={scoreView === 'ad' ? kw.adScore : kw.seoScore} size="sm" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="md:hidden space-y-1 p-2">
                      {clusterKws.map((kw, i) => (
                        <div key={i} className={`bg-gray-800/30 rounded-lg p-3 ${(scoreView === 'ad' ? kw.adScore : kw.seoScore) >= 75 ? 'border-l-[3px] border-l-jackpot-500' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <MaskedKeyword keyword={kw.keyword} paid={paid} />
                            <JackpotScore score={scoreView === 'ad' ? kw.adScore : kw.seoScore} size="sm" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="font-mono">{kw.avgMonthlySearches.toLocaleString()}/mo</span>
                            <span className={`font-medium ${kw.competition === 'LOW' ? 'text-score-green' : kw.competition === 'MEDIUM' ? 'text-score-yellow' : 'text-score-red'}`}>{kw.competition}</span>
                            {kw.intent && <IntentBadge intent={kw.intent} />}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Cluster summary */}
                    <div className="flex gap-6 px-4 py-2.5 bg-gray-950/50 border-t border-gray-800 text-xs text-gray-500">
                      <div>Combined volume: <span className="text-jackpot-400 font-medium">{totalVol.toLocaleString()}/mo</span></div>
                      <div>Avg CPC: <span className="text-white font-medium">${avgCpc.toFixed(2)}</span></div>
                      <div>{clusterKws.filter((k) => k.competition === 'LOW').length} LOW / {clusterKws.filter((k) => k.competition === 'MEDIUM').length} MED / {clusterKws.filter((k) => k.competition === 'HIGH').length} HIGH</div>
                    </div>
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* Keywords */}
      {viewMode === 'keywords' && <div className="space-y-2">
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
                  <th className="text-center px-4 py-3 font-medium w-20 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('intent')}>
                    Intent{sortIndicator('intent')}
                  </th>
                  <th className="text-center px-3 py-3 font-medium w-16 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('relevance')}>
                    Rel{sortIndicator('relevance')}
                  </th>
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
                      <td className="px-4 py-3 text-center">
                        {kw.intent && <IntentBadge intent={kw.intent} />}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {kw.aiRelevance !== undefined ? (
                          <span className={`text-xs font-bold ${kw.aiRelevance >= 8 ? 'text-score-green' : kw.aiRelevance >= 5 ? 'text-score-yellow' : 'text-score-red'}`}>{kw.aiRelevance}</span>
                        ) : relevanceLoading ? (
                          <span className="text-gray-600 text-xs animate-pulse">...</span>
                        ) : (
                          <span className="text-gray-700">-</span>
                        )}
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
                        <td colSpan={10} className="p-0">
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
                        <span className="text-gray-500 text-xs">Source / Intent</span>
                        <div className="flex items-center gap-1">
                          <SourceBadge source={kw.source} />
                          {kw.intent && <IntentBadge intent={kw.intent} />}
                          {kw.aiRelevance !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${kw.aiRelevance >= 8 ? 'bg-score-green/10 text-score-green border-score-green/20' : kw.aiRelevance >= 5 ? 'bg-score-yellow/10 text-score-yellow border-score-yellow/20' : 'bg-score-red/10 text-score-red border-score-red/20'}`}>
                              R:{kw.aiRelevance}
                            </span>
                          )}
                        </div>
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

      </div>}

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
          {!isSaved && user && paid && (
            <>
              <div className="w-px h-6 bg-gray-700" />
              <button
                onClick={handleSaveSearch}
                disabled={saving}
                className="text-sm text-jackpot-400 hover:text-jackpot-300 font-medium transition"
              >
                {saving ? 'Saving...' : 'Save Search'}
              </button>
              {selectedKeywords.size > 200 && (
                <span className="text-xs text-score-yellow">Max 200</span>
              )}
            </>
          )}
          {isSaved && (
            <>
              <div className="w-px h-6 bg-gray-700" />
              <span className="text-xs text-score-green font-medium">Saved</span>
            </>
          )}
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
