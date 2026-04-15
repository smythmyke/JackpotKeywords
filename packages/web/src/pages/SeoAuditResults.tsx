import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEO_AUDIT_CATEGORY_LABELS, type SeoAuditCategory, type SeoAuditResult, type SeoAuditKeywordGap, type MiniKeywordResult } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import { getAuditResult, fetchAuditKeywords } from '../services/api';
import { trackEvent } from '../lib/analytics';
import ScoreGauge from '../components/audit/ScoreGauge';
import CategoryScoreCard from '../components/audit/CategoryScoreCard';
import CheckItem from '../components/audit/CheckItem';
import KeywordGapModal from '../components/audit/KeywordGapModal';
import MaskedKeyword from '../components/MaskedKeyword';

const CATEGORIES: SeoAuditCategory[] = [
  'technical', 'content', 'crawlability', 'structured_data', 'local_geo', 'social_sharing',
];

/** Number of checklist items to show before blurring for unpaid users */
const FREE_PREVIEW_CHECKS = 4;

export default function SeoAuditResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auditId } = useParams<{ auditId: string }>();
  const [activeCategory, setActiveCategory] = useState<SeoAuditCategory | null>(null);
  const { user, signInWithGoogle, getToken } = useAuthContext();
  const [fetchedResult, setFetchedResult] = useState<SeoAuditResult | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const fetchAttempted = useRef(false);
  const fetchAttemptedAsAuthed = useRef(false);
  const [selectedGap, setSelectedGap] = useState<SeoAuditKeywordGap | null>(null);
  const [gapModalOpen, setGapModalOpen] = useState(false);
  const [keywordPreview, setKeywordPreview] = useState<MiniKeywordResult[] | null>(null);
  const [keywordPreviewLoading, setKeywordPreviewLoading] = useState(false);
  const [keywordPreviewError, setKeywordPreviewError] = useState(false);
  const keywordPreviewFetched = useRef(false);
  const keywordPreviewFetchedAsAuthed = useRef(false);
  type SortColumn = 'keyword' | 'volume' | 'cpc' | 'competition';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const PAGE_SIZE = 50;

  // Try location state first, then sessionStorage. Memoize so the reference
  // is stable across renders — otherwise `result = fetchedResult || stateResult`
  // returns a new reference every render, which would retrigger effects that
  // depend on `result` (like the keyword preview fetch) and could loop.
  const locationStateResult = (location.state as any)?.result as SeoAuditResult | undefined;
  const stateResult = useMemo<SeoAuditResult | undefined>(() => {
    if (locationStateResult) return locationStateResult;
    try {
      const cached = sessionStorage.getItem('jk_audit_results');
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return undefined;
  }, [locationStateResult]);

  // One-time fetch: either loading a saved audit by ID, or re-fetching masked results
  const isMasked = stateResult && !stateResult.paid;
  const shouldFetchById = !stateResult && auditId && auditId !== 'anonymous';
  const shouldRefetchMasked = !!user && isMasked && stateResult?.id;

  // DEBUG: Log auth/blur state on every render to diagnose stale-blur bug
  console.log('[AuditResults] render state:', {
    userUid: user?.uid ?? null,
    userEmail: user?.email ?? null,
    isMasked,
    shouldFetchById,
    shouldRefetchMasked,
    fetchAttempted: fetchAttempted.current,
    hasFetchedResult: !!fetchedResult,
    stateResultId: stateResult?.id ?? null,
    stateResultPaid: stateResult?.paid ?? null,
    auditId,
  });

  // NOTE: fetchAttempted invalidation is handled inside the useEffect below
  // via fetchAttemptedAsAuthed. Mutating refs in the render phase caused an
  // infinite re-render loop with Firebase auth's multi-step state transitions,
  // because getToken's useCallback reference churns as state.user updates and
  // the render-phase reset would flip the flag repeatedly (React error #300).

  useEffect(() => {
    if (fetchedResult) {
      console.log('[AuditResults] useEffect skipped: already have fetched result');
      return;
    }
    if (!shouldFetchById && !shouldRefetchMasked) {
      console.log('[AuditResults] useEffect skipped: no fetch needed', { shouldFetchById, shouldRefetchMasked });
      return;
    }

    // Invalidate a prior anon fetch once per auth transition — if the user
    // just became authenticated and the previous fetch happened as anon, we
    // need to refetch to get the unmasked data. The ref tracks the auth
    // state of the last attempt so this only fires once per transition.
    const needRefetchForAuth = !!user && fetchAttempted.current && !fetchAttemptedAsAuthed.current && shouldRefetchMasked;
    if (fetchAttempted.current && !needRefetchForAuth) {
      console.log('[AuditResults] useEffect skipped: already attempted', { fetchAttemptedAsAuthed: fetchAttemptedAsAuthed.current });
      return;
    }

    const targetId = shouldFetchById ? auditId! : stateResult!.id;
    fetchAttempted.current = true;
    fetchAttemptedAsAuthed.current = !!user;
    console.log('[AuditResults] Fetching audit:', { targetId, shouldFetchById, shouldRefetchMasked, needRefetchForAuth });

    async function loadAudit() {
      setFetchLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          console.error('[AuditResults] No token available after login — cannot re-fetch');
          setFetchError(true);
          return;
        }
        console.log('[AuditResults] Calling getAuditResult with token, id:', targetId);
        const data = await getAuditResult(token, targetId);
        console.log('[AuditResults] Re-fetch success, paid:', data.paid, 'maskedContent:', data.checks?.some((c: any) => c.recommendation?.includes('•••')));
        setFetchedResult(data);
        sessionStorage.setItem('jk_audit_results', JSON.stringify(data));
      } catch (err) {
        console.error('[AuditResults] Re-fetch failed:', err);
        setFetchError(true);
      } finally {
        setFetchLoading(false);
      }
    }
    loadAudit();
  }, [shouldFetchById, shouldRefetchMasked, auditId, stateResult?.id, getToken, fetchedResult, user]);

  // Post-login redirect: if user just signed in via the keyword gap modal, navigate to keyword search
  useEffect(() => {
    if (!user) return;
    const redirect = sessionStorage.getItem('jk_audit_keyword_redirect');
    if (redirect) {
      sessionStorage.removeItem('jk_audit_keyword_redirect');
      navigate(redirect);
    }
  }, [user, navigate]);

  // Prefer fetched (unmasked) result over state (possibly masked) result
  let result = fetchedResult || stateResult;

  // Lazy-fetch the bundled mini keyword preview once the audit has loaded.
  // Runs in the background so users see the audit instantly while the
  // preview (~3-5s of Keyword Planner) streams in behind.
  //
  // Refetches when the user transitions from anonymous → authenticated so
  // a preview that was masked server-side under anon creds gets replaced
  // with the full unmasked list. keywordPreviewFetchedAsAuthed tracks the
  // auth state of the last fetch so we only invalidate once per transition.
  useEffect(() => {
    if (!result) return;

    const resultPreview = result.keywordPreview;
    const hasResultPreview = Array.isArray(resultPreview) && resultPreview.length > 0;
    const resultPreviewIsLocked = hasResultPreview
      && resultPreview.some((k) => k.keyword.startsWith('\u2022\u2022\u2022'));

    // Fresh unmasked preview in the result object? Adopt directly.
    if (hasResultPreview && !resultPreviewIsLocked) {
      setKeywordPreview(resultPreview);
      keywordPreviewFetched.current = true;
      keywordPreviewFetchedAsAuthed.current = !!user;
      return;
    }

    // User just became authenticated after an earlier anon fetch — invalidate
    // so we refetch with credentials and get the full unmasked list.
    if (!!user && keywordPreviewFetched.current && !keywordPreviewFetchedAsAuthed.current) {
      keywordPreviewFetched.current = false;
    }

    if (keywordPreviewFetched.current) return;
    if (!result.id) return;

    // IMPORTANT: set BOTH refs synchronously. setKeywordPreviewLoading triggers
    // a re-render while the async fetch is still in flight; if fetchedAsAuthed
    // isn't set now, the re-render would see fetched=true/fetchedAsAuthed=false/
    // user=true and re-trigger the invalidation branch, causing an infinite loop.
    keywordPreviewFetched.current = true;
    keywordPreviewFetchedAsAuthed.current = !!user;
    setKeywordPreviewLoading(true);
    (async () => {
      try {
        const token = user ? await getToken() : null;
        const resp = await fetchAuditKeywords(token, result!.id);
        setKeywordPreview(resp.keywordPreview || []);
      } catch {
        setKeywordPreviewError(true);
      } finally {
        setKeywordPreviewLoading(false);
      }
    })();
  }, [result, user, getToken]);

  // Keyword preview: sort visible rows by selected column, pin locked rows to the end.
  // IMPORTANT: this useMemo must run BEFORE the early returns below. All hooks
  // must be called unconditionally on every render — moving them after an
  // early return causes hook-count mismatches and React to crash with #300
  // when fetchLoading toggles during sign-in.
  const COMPETITION_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, UNKNOWN: 4, UNSPECIFIED: 5 };
  const sortedKeywords = useMemo(() => {
    if (!keywordPreview) return [];
    const locked = keywordPreview.filter((k) => k.keyword.startsWith('\u2022\u2022\u2022'));
    const unlocked = keywordPreview.filter((k) => !k.keyword.startsWith('\u2022\u2022\u2022'));
    const sorted = [...unlocked].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'keyword') {
        cmp = a.keyword.localeCompare(b.keyword);
      } else if (sortColumn === 'volume') {
        cmp = Number(a.monthlyVolume) - Number(b.monthlyVolume);
      } else if (sortColumn === 'cpc') {
        const aAvg = (Number(a.lowCpc) + Number(a.highCpc)) / 2;
        const bAvg = (Number(b.lowCpc) + Number(b.highCpc)) / 2;
        cmp = aAvg - bAvg;
      } else if (sortColumn === 'competition') {
        cmp = (COMPETITION_RANK[a.competition] || 99) - (COMPETITION_RANK[b.competition] || 99);
      }
      // Tie-breaker: alphabetical by keyword. Without this, many rows sharing
      // the same volume (e.g., 15 keywords all at "10") stay in insertion
      // order on both asc and desc, making the sort look broken.
      if (cmp === 0 && sortColumn !== 'keyword') {
        cmp = a.keyword.localeCompare(b.keyword);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return [...sorted, ...locked];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordPreview, sortColumn, sortDirection]);

  if (fetchLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400">Loading audit results...</div>
      </div>
    );
  }

  if (!result) {
    if (fetchError || (shouldFetchById && fetchAttempted.current)) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="text-gray-400">Audit not found or you don&apos;t have access.</div>
          <Link to="/seo-audit" className="text-jackpot-400 hover:underline">Run a new audit</Link>
        </div>
      );
    }
    if (auditId && auditId !== 'anonymous') return null; // Still loading
    return <Navigate to="/seo-audit" replace />;
  }

  // Check if the result content is actually masked (server-side replaced text)
  const hasServerMaskedContent = result.keywordGaps.some((g) => g.keyword.includes('\u2022\u2022\u2022'))
    || result.recommendations.some((r) => r.title.includes('\u2022\u2022\u2022'))
    || result.checks.some((c) => c.recommendation?.includes('\u2022\u2022\u2022'));

  // User is logged in but has stale masked data — show re-run banner
  const needsRerun = !!user && hasServerMaskedContent;

  // Anonymous and has masked content = not paid. Logged in with clean data = paid.
  const paid = !hasServerMaskedContent;

  // DEBUG: Log blur decision
  console.log('[AuditResults] blur decision:', {
    hasServerMaskedContent,
    needsRerun,
    paid,
    resultSource: fetchedResult ? 'fetched' : 'state/cache',
    resultId: result.id,
    resultPaid: result.paid,
  });

  const filteredChecks = activeCategory
    ? result.checks.filter((c) => c.category === activeCategory)
    : result.checks;

  const domain = result.domain.replace(/^https?:\/\//, '');

  // Split checks into visible and blurred for unpaid
  const visibleChecks = paid ? filteredChecks : filteredChecks.slice(0, FREE_PREVIEW_CHECKS);
  const blurredChecks = paid ? [] : filteredChecks.slice(FREE_PREVIEW_CHECKS);

  const totalKeywords = sortedKeywords.length;
  const totalPages = Math.max(1, Math.ceil(totalKeywords / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, totalPages);
  const pageStart = (clampedPage - 1) * PAGE_SIZE;
  const paginatedKeywords = sortedKeywords.slice(pageStart, pageStart + PAGE_SIZE);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection(col === 'keyword' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (!paid && newPage > 1) {
      trackEvent('upgrade_clicked', { source: 'audit_preview_pagination' });
      trackEvent('paywall_viewed', { source: 'audit_preview_pagination' });
      setShowUpgradeModal(true);
      return;
    }
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const sortArrow = (col: SortColumn) =>
    sortColumn === col ? (sortDirection === 'asc' ? ' \u25b2' : ' \u25bc') : '';

  return (
    <>
      <Helmet>
        <title>SEO Audit Results — {domain}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Re-run banner for logged-in users with stale masked data */}
        {needsRerun && (
          <div className="mb-6 bg-jackpot-500/10 border border-jackpot-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">You&apos;re signed in — get the full report free</p>
              <p className="text-gray-400 text-sm">This audit was run before you signed in. Re-run to see all recommendations and keyword gaps.</p>
            </div>
            <Link
              to={`/seo-audit?url=${encodeURIComponent(result.url)}`}
              className="shrink-0 bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2.5 rounded-lg transition"
            >
              Re-run Audit Free
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
          <ScoreGauge score={result.overallScore} size={140} />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold text-white mb-1">SEO Audit: {domain}</h1>
            <p className="text-gray-500 text-sm">
              {result.metadata.pagesAnalyzed} pages analyzed in {(result.metadata.executionTimeMs / 1000).toFixed(0)}s
              &middot; {new Date(result.createdAt).toLocaleDateString()}
            </p>
            <div className="flex gap-4 mt-3">
              <span className="text-sm">
                <span className="text-green-400 font-bold">{result.checks.filter((c) => c.status === 'pass').length}</span>
                <span className="text-gray-500"> passed</span>
              </span>
              <span className="text-sm">
                <span className="text-yellow-400 font-bold">{result.checks.filter((c) => c.status === 'warning').length}</span>
                <span className="text-gray-500"> warnings</span>
              </span>
              <span className="text-sm">
                <span className="text-red-400 font-bold">{result.checks.filter((c) => c.status === 'fail').length}</span>
                <span className="text-gray-500"> failures</span>
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              if (!paid) {
                trackEvent('upgrade_clicked', { source: 'audit_pdf_export' });
                trackEvent('paywall_viewed', { source: 'audit_pdf_export' });
                setShowUpgradeModal(true);
                return;
              }
              if (pdfExporting || keywordPreviewLoading) return;
              setPdfExporting(true);
              try {
                const { exportAuditPdf } = await import('../services/pdfExport');
                await exportAuditPdf(result, keywordPreview);
                trackEvent('upgrade_clicked', { source: 'audit_pdf_exported', result: 'success' });
              } catch (err) {
                console.error('[AuditResults] PDF export failed:', err);
              } finally {
                setPdfExporting(false);
              }
            }}
            disabled={pdfExporting || (paid && keywordPreviewLoading)}
            className="bg-jackpot-500 hover:bg-jackpot-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold px-5 py-2.5 rounded-lg text-sm transition whitespace-nowrap flex items-center gap-2"
            title={
              !paid
                ? 'PDF export available with Pro or a paid search credit'
                : keywordPreviewLoading
                  ? 'Waiting for keyword opportunities to finish loading'
                  : 'Download a branded PDF report'
            }
          >
            {pdfExporting ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black/40 border-t-transparent" />
                Generating…
              </>
            ) : paid && keywordPreviewLoading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-400/40 border-t-transparent" />
                Waiting for keywords…
              </>
            ) : (
              <>&#128196; Export PDF{!paid && <span className="text-xs opacity-75">(Pro)</span>}</>
            )}
          </button>
        </div>

        {/* Category Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {CATEGORIES.map((cat) => {
            const cs = result.categoryScores[cat];
            return (
              <CategoryScoreCard
                key={cat}
                category={cat}
                score={cs?.score ?? 0}
                passed={cs?.passed ?? 0}
                total={cs?.total ?? 0}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              />
            );
          })}
        </div>

        {/* Active filter label */}
        {activeCategory && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">
              Showing: {SEO_AUDIT_CATEGORY_LABELS[activeCategory]}
            </span>
            <button
              onClick={() => setActiveCategory(null)}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              (show all)
            </button>
          </div>
        )}

        {/* Keyword Opportunities — moved up so the loading state is visible
            immediately after the score summary, signalling more data is on the way */}
        {(keywordPreviewLoading || (keywordPreview !== null && keywordPreview.length > 0) || (keywordPreview !== null && keywordPreview.length < 3 && !keywordPreviewLoading) || keywordPreviewError) && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-2">
              Keyword Opportunities for {domain}
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Real search volume &amp; CPC data from Google Ads. Top opportunities locked — unlock with Pro or a single-search credit.
            </p>
            {keywordPreviewLoading ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-jackpot-500 border-t-transparent mb-2" />
                <div>Finding keyword opportunities…</div>
                <div className="text-xs text-gray-500 mt-1">This takes ~10-15 seconds</div>
              </div>
            ) : keywordPreviewError || (keywordPreview !== null && keywordPreview.length < 3) ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-gray-300 mb-4">
                  {keywordPreviewError
                    ? 'Keyword preview unavailable right now.'
                    : `We found limited keyword data for ${domain} from the audit alone.`}
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  Run a full keyword search for {domain} to uncover 1,000+ scored opportunities with clustering, intent classification, and Jackpot Scores.
                </p>
                <Link
                  to={`/?url=${encodeURIComponent(result.url)}`}
                  className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2.5 rounded-lg text-sm transition"
                >
                  Run full keyword research &rarr;
                </Link>
              </div>
            ) : keywordPreview && keywordPreview.length > 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-950 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th
                        className={`text-left px-4 py-2 cursor-pointer select-none hover:text-gray-300 ${sortColumn === 'keyword' ? 'text-jackpot-400' : ''}`}
                        onClick={() => handleSort('keyword')}
                      >
                        Keyword{sortArrow('keyword')}
                      </th>
                      <th
                        className={`text-right px-4 py-2 cursor-pointer select-none hover:text-gray-300 ${sortColumn === 'volume' ? 'text-jackpot-400' : ''}`}
                        onClick={() => handleSort('volume')}
                      >
                        Volume{sortArrow('volume')}
                      </th>
                      <th
                        className={`text-right px-4 py-2 cursor-pointer select-none hover:text-gray-300 ${sortColumn === 'cpc' ? 'text-jackpot-400' : ''}`}
                        onClick={() => handleSort('cpc')}
                      >
                        CPC{sortArrow('cpc')}
                      </th>
                      <th
                        className={`text-right px-4 py-2 cursor-pointer select-none hover:text-gray-300 ${sortColumn === 'competition' ? 'text-jackpot-400' : ''}`}
                        onClick={() => handleSort('competition')}
                      >
                        Competition{sortArrow('competition')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedKeywords.map((kw, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="px-4 py-2">
                          <MaskedKeyword keyword={kw.keyword} paid={paid} />
                        </td>
                        <td className="px-4 py-2 text-right text-white tabular-nums">{kw.monthlyVolume.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-white tabular-nums">
                          ${kw.lowCpc.toFixed(2)}&ndash;${kw.highCpc.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            kw.competition === 'LOW' ? 'bg-green-500/10 text-green-400' :
                            kw.competition === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                            kw.competition === 'HIGH' ? 'bg-red-500/10 text-red-400' :
                            'bg-gray-800 text-gray-500'
                          }`}>
                            {kw.competition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalKeywords > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 text-sm text-gray-400">
                    <div>
                      Showing {pageStart + 1}&ndash;{Math.min(pageStart + PAGE_SIZE, totalKeywords)} of{' '}
                      <span className="text-white font-medium">{totalKeywords.toLocaleString()}</span> keywords
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePageChange(clampedPage - 1)}
                        disabled={clampedPage === 1}
                        className="px-3 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        &larr; Prev
                      </button>
                      <span className="text-gray-500">Page {clampedPage} of {totalPages}</span>
                      <button
                        onClick={() => handlePageChange(clampedPage + 1)}
                        disabled={clampedPage >= totalPages}
                        className="px-3 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        )}

        {/* Full keyword research upsell — sits below the preview as the natural
            next step. Only shown once the preview itself is settled (success or
            error) so it doesn't compete with the loading state. */}
        {!keywordPreviewLoading && (keywordPreview !== null || keywordPreviewError) && (
          <section className="mb-12 bg-jackpot-500/5 border border-jackpot-500/20 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  Want the Full Picture?
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  This preview shows a slice of opportunities for {domain}. Run a full keyword research to get
                  <span className="text-white font-medium"> 1,000+ scored keywords</span> with clustering, intent
                  classification, Jackpot Scores, and Google Trends overlay.
                </p>
              </div>
              <Link
                to={`/?prefill=${encodeURIComponent(result.url)}`}
                state={{ prefillQuery: result.pageResults[0]?.title || domain }}
                className="shrink-0 bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition text-center"
              >
                Run full keyword research &rarr;
              </Link>
            </div>
          </section>
        )}

        {/* Checklist — multi-column layout */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">
            SEO Checklist ({filteredChecks.length} items)
          </h2>

          {/* Visible checks in 2 columns */}
          {visibleChecks.length > 0 && (
            <div className="grid md:grid-cols-2 gap-x-4">
              {visibleChecks.map((check) => (
                <div key={check.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 mb-3">
                  <CheckItem check={check} paid={paid} />
                </div>
              ))}
            </div>
          )}

          {/* Blurred checks for unpaid users */}
          {blurredChecks.length > 0 && (
            <div className="relative mt-2">
              <div className="grid md:grid-cols-2 gap-x-4 blur-[6px] select-none pointer-events-none">
                {blurredChecks.map((check) => (
                  <div key={check.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 mb-3">
                    <CheckItem check={check} paid={false} />
                  </div>
                ))}
              </div>
              {/* Unlock overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-gray-950/80 backdrop-blur-sm rounded-2xl px-8 py-6 border border-gray-800">
                  <p className="text-white font-bold text-lg mb-2">
                    +{blurredChecks.length} more checks found
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Sign in free to see all results and recommendations
                  </p>
                  <button
                    onClick={signInWithGoogle}
                    className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-2.5 rounded-lg transition"
                  >
                    Sign In Free to Unlock
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredChecks.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center">No checks in this category</p>
          )}
        </section>

        {/* Page-by-Page Analysis */}
        {result.pageResults.length > 1 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Page Analysis ({result.pageResults.length} pages)
            </h2>
            <div className="space-y-3">
              {result.pageResults.map((page) => (
                <details
                  key={page.url}
                  className="bg-gray-900 border border-gray-800 rounded-xl group"
                >
                  <summary className="px-4 py-3 cursor-pointer hover:bg-gray-800/50 rounded-xl transition flex items-center gap-3">
                    <span className="text-gray-500 text-sm shrink-0 group-open:rotate-90 transition-transform">&#9654;</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {page.title || page.url}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{page.url}</div>
                    </div>
                    {page.issues.length > 0 && (
                      <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded shrink-0 ml-auto">
                        {page.issues.length} issues
                      </span>
                    )}
                  </summary>
                  <div className="px-4 pb-4 border-t border-gray-800">
                    <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                      <div>
                        <span className="text-gray-500">Title:</span>{' '}
                        <span className="text-gray-300">{page.title || 'Missing'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">H1:</span>{' '}
                        <span className="text-gray-300">{page.h1 || 'Missing'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Meta:</span>{' '}
                        <span className="text-gray-300">{page.metaDescription ? `${page.metaDescription.slice(0, 80)}...` : 'Missing'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Words:</span>{' '}
                        <span className="text-gray-300">{page.wordCount || 'N/A'}</span>
                      </div>
                    </div>
                    {page.issues.length > 0 && (
                      <div className="mt-2">
                        {page.issues.map((issue) => (
                          <CheckItem key={issue.id} check={issue} paid={paid} />
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Keyword Gaps */}
        {result.keywordGaps.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Keyword Gap Opportunities ({result.keywordGaps.length})
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Keyword</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Opportunity</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {result.keywordGaps.map((gap, i) => {
                    const isLocked = !paid && gap.keyword.startsWith('\u2022\u2022\u2022');
                    const samples = gap.sampleKeywords || [];
                    const VISIBLE_SAMPLES = 2;
                    return (
                      <tr
                        key={i}
                        className="border-b border-gray-800/50 last:border-0 cursor-pointer hover:bg-gray-800/50 transition"
                        onClick={() => { setSelectedGap(isLocked ? null : gap); setGapModalOpen(true); }}
                      >
                        <td className={`px-4 py-3 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-white font-medium'}`} colSpan={isLocked ? 1 : undefined}>
                          <div>{gap.keyword}</div>
                          {samples.length > 0 && !isLocked && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {samples.map((kw, j) => {
                                const isSampleLocked = !paid && j >= VISIBLE_SAMPLES;
                                return (
                                  <span
                                    key={j}
                                    className={`text-xs px-2 py-0.5 rounded-full border ${
                                      isSampleLocked
                                        ? 'bg-gray-800 border-gray-700 text-gray-500 blur-[3px] select-none'
                                        : 'bg-jackpot-500/10 border-jackpot-500/30 text-jackpot-400'
                                    }`}
                                  >
                                    {kw}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className={`px-4 py-3 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-gray-400'}`}>
                          {gap.opportunity}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            gap.difficulty === 'easy' ? 'bg-green-400/10 text-green-400' :
                            gap.difficulty === 'hard' ? 'bg-red-400/10 text-red-400' :
                            'bg-yellow-400/10 text-yellow-400'
                          }`}>
                            {gap.difficulty}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Recommendations ({result.recommendations.length})
            </h2>
            <div className="space-y-3">
              {result.recommendations.map((rec, i) => {
                const isLocked = !paid && rec.title.startsWith('\u2022\u2022\u2022');
                return (
                  <div
                    key={i}
                    className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${isLocked ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-lg font-bold shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        rec.impact === 'high' ? 'bg-red-400/10 text-red-400' :
                        rec.impact === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-white'}`}>
                          {rec.title}
                        </div>
                        <p className={`text-sm mt-1 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-gray-400'}`}>
                          {rec.description}
                        </p>
                        {!isLocked && (
                          <div className="flex gap-2 mt-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              rec.impact === 'high' ? 'bg-red-400/10 text-red-400' :
                              rec.impact === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                              'bg-gray-800 text-gray-500'
                            }`}>
                              {rec.impact} impact
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                              {rec.effort} effort
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                              {SEO_AUDIT_CATEGORY_LABELS[rec.category as SeoAuditCategory] || rec.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sign-in CTA for anonymous users — copy reflects the pooled
            3-free-runs model (search OR audit), not the old "audits are
            free for all signed-in users" line. */}
        {!paid && (
          <section className="text-center py-10 border-t border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-3">Sign In to Save This Report</h2>
            <p className="text-gray-400 mb-6 max-w-lg mx-auto">
              Sign in free to save your audit, see the full report, and unlock 3 lifetime runs of keyword research or SEO audits. No credit card required.
            </p>
            <button
              onClick={signInWithGoogle}
              className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
            >
              Sign In Free with Google
            </button>
          </section>
        )}

        {/* Workflow continuation for paid users — anon/free users already
            get the keyword-research upsell up top via "Want the Full Picture?" */}
        {paid && (
          <section className="py-10 border-t border-gray-800 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              Find <span className="text-jackpot-400">Keywords</span> for {domain}
            </h2>
            <p className="text-gray-400 mb-6 max-w-lg mx-auto">
              You&apos;ve got the audit. Now run a full keyword research to get 1,000+ scored opportunities with clustering, intent classification, and Jackpot Scores.
            </p>
            <Link
              to="/"
              state={{ prefillQuery: result.pageResults[0]?.title || domain }}
              className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-xl text-lg transition"
            >
              Find Keywords for {domain} &rarr;
            </Link>
          </section>
        )}

        {/* Cross-link for all users */}
        <div className="text-center mt-8">
          <Link to="/seo-audit" className="text-sm text-gray-500 hover:text-gray-300 transition">
            Run another SEO audit &rarr;
          </Link>
        </div>
      </div>

      <KeywordGapModal
        open={gapModalOpen}
        onClose={() => setGapModalOpen(false)}
        gap={selectedGap}
        domain={domain}
        isSignedIn={!!user}
        onSignIn={() => {
          sessionStorage.setItem('jk_audit_keyword_redirect', `/?prefill=${encodeURIComponent(domain)}`);
          signInWithGoogle();
          setGapModalOpen(false);
        }}
        onKeywordSearch={() => {
          setGapModalOpen(false);
          navigate(`/?prefill=${encodeURIComponent(domain)}`);
        }}
      />

      {showUpgradeModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgradeModal(false); }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 relative" role="dialog" aria-modal="true">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-white text-xl leading-none"
              aria-label="Close"
              onClick={() => setShowUpgradeModal(false)}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold text-white mb-3">Unlock All {totalKeywords.toLocaleString()} Keywords</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              You&apos;re seeing the first page of keyword opportunities for {domain}. Upgrade to Pro or use a single-search credit to unlock every page, plus full Jackpot Scores and clustering in the keyword research tool.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  trackEvent('upgrade_clicked', { source: 'audit_preview_pagination_modal' });
                  navigate('/pricing');
                }}
                className="w-full bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold py-2.5 rounded-lg transition"
              >
                See Pricing
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full text-gray-400 hover:text-white text-sm py-2 transition"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
