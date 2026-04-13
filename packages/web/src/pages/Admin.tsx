import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthContext } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/demo-jackpotkeywords/us-central1/api';

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

interface Stats {
  totalUsers: number;
  planBreakdown: Record<string, number>;
  totalSearches: number;
  totalCreditsUsed: number;
  totalCreditsPurchased: number;
  totalFreeSearchesUsed: number;
  recentUsers: { email: string; plan: string; createdAt: string; searchCount: number }[];
}

interface SearchAnalytics {
  searchCount: number;
  errorCount: number;
  errorRate: number;
  anonSearches: number;
  authSearches: number;
  paidSearches: number;
  freeSearches: number;
  avgKeywords: number;
  avgExecutionMs: number;
  saveCount: number;
  saveRate: number;
  expandCount: number;
  topQueries: { query: string; count: number }[];
  signupCount: number;
  newUserCount: number;
  auditCount: number;
  auditErrorCount: number;
  anonAudits: number;
  authAudits: number;
}

interface FunnelStage {
  label: string;
  count: number;
  pctOfTop: number;
  pctOfPrev: number;
  description: string;
}

interface DailyPoint {
  date: string; // YYYY-MM-DD
  label: string; // short display
  searches: number;
  signups: number;
  paid: number;
  audits: number;
}

interface SourceRow {
  source: string; // display name (e.g. "Google Ads", "google/cpc", "direct")
  detail: string; // campaign or referrer
  signups: number;
  proCount: number;
  payingCount: number;
  conversionRate: number; // % of signups that became pro
}

interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchConsoleData {
  startDate: string;
  endDate: string;
  dimension: string;
  rows: SearchConsoleRow[];
  totals: { clicks: number; impressions: number; ctr: number; position: number };
}

interface ActivityLog {
  action: string;
  userId?: string;
  email?: string;
  query?: string;
  url?: string;
  inputType?: 'description' | 'url' | 'both';
  productLabel?: string;
  keywordCount?: number;
  executionTimeMs?: number;
  paid?: boolean;
  error?: string;
  isNewUser?: boolean;
  timestamp: string;
}

export default function Admin() {
  const { user, profile, loading: authLoading, getToken } = useAuthContext();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[] | null>(null);
  const [timeSeries, setTimeSeries] = useState<DailyPoint[] | null>(null);
  const [chartRange, setChartRange] = useState<7 | 30>(30);
  const [excludeAdmin, setExcludeAdmin] = useState(true);
  const [sources, setSources] = useState<SourceRow[] | null>(null);
  const [rawData, setRawData] = useState<{ logs: any[]; users: any[]; adminIds: Set<string> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scData, setScData] = useState<SearchConsoleData | null>(null);
  const [scDimension, setScDimension] = useState<'query' | 'page'>('query');
  const [scDays, setScDays] = useState<7 | 28>(28);
  const [scLoading, setScLoading] = useState(false);
  const [scError, setScError] = useState<string | null>(null);

  const isAdmin = (profile?.email && ADMIN_EMAILS.includes(profile.email)) || (user?.email && ADMIN_EMAILS.includes(user.email));

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    async function loadStats() {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500))
        );

        const rawUsers: any[] = [];
        const adminIds = new Set<string>();
        usersSnap.forEach((doc) => {
          const data: any = { ...doc.data(), uid: doc.id };
          rawUsers.push(data);
          if (data.email && ADMIN_EMAILS.includes(data.email)) {
            adminIds.add(doc.id);
          }
        });

        // Fetch activity logs (more entries for analytics aggregation)
        const logsSnap = await getDocs(
          query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(1000))
        );
        const rawLogs: any[] = [];
        logsSnap.forEach((doc) => {
          rawLogs.push(doc.data());
        });

        setRawData({ logs: rawLogs, users: rawUsers, adminIds });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [authLoading, isAdmin]);

  // Recompute everything when raw data or filter changes
  useEffect(() => {
    if (!rawData) return;
    const { logs: rawLogs, users: rawUsers, adminIds } = rawData;

    // Filter helper
    const isAdminLog = (log: any) => {
      if (!excludeAdmin) return false;
      if (log.userId && adminIds.has(log.userId)) return true;
      if (log.email && ADMIN_EMAILS.includes(log.email)) return true;
      return false;
    };
    const isAdminUser = (user: any) => excludeAdmin && adminIds.has(user.uid);

    const filteredLogs = rawLogs.filter((l) => !isAdminLog(l));
    const filteredUsers = rawUsers.filter((u) => !isAdminUser(u));

    // Stats
    let totalUsers = 0;
    const planBreakdown: Record<string, number> = { free: 0, pro: 0, agency: 0 };
    let totalSearches = 0;
    let totalCreditsUsed = 0;
    let totalCreditsPurchased = 0;
    let totalFreeSearchesUsed = 0;
    const recentUsers: Stats['recentUsers'] = [];

    filteredUsers.forEach((data) => {
      totalUsers++;
      const plan = data.plan || 'free';
      planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
      const credits = data.credits || {};
      totalCreditsUsed += credits.lifetimeUsed || 0;
      totalCreditsPurchased += credits.lifetimePurchased || 0;
      totalFreeSearchesUsed += credits.freeSearchesUsed || 0;
      totalSearches += (credits.lifetimeUsed || 0) + (credits.freeSearchesUsed || 0);
      if (recentUsers.length < 20) {
        recentUsers.push({
          email: data.email || 'unknown',
          plan,
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || 'unknown',
          searchCount: (credits.lifetimeUsed || 0) + (credits.freeSearchesUsed || 0),
        });
      }
    });

    setStats({
      totalUsers,
      planBreakdown,
      totalSearches,
      totalCreditsUsed,
      totalCreditsPurchased,
      totalFreeSearchesUsed,
      recentUsers,
    });

    // Format logs for display
    const logEntries: ActivityLog[] = filteredLogs.slice(0, 100).map((data) => ({
      ...data,
      timestamp: data.timestamp instanceof Timestamp
        ? data.timestamp.toDate().toLocaleString()
        : data.timestamp || '',
    } as ActivityLog));
    setLogs(logEntries);

    // Compute search analytics
    const searches = filteredLogs.filter((l) => l.action === 'search');
    const errors = filteredLogs.filter((l) => l.action === 'search_error');
    const saves = filteredLogs.filter((l) => l.action === 'save');
    const expands = filteredLogs.filter((l) => l.action === 'expand');
    const auths = filteredLogs.filter((l) => l.action === 'auth_init');

    const anonSearches = searches.filter((s) => s.userId === 'anonymous').length;
    const authSearches = searches.length - anonSearches;
    const paidSearches = searches.filter((s) => s.paid === true).length;
    const freeSearches = searches.length - paidSearches;

    const validKwCounts = searches.filter((s) => typeof s.keywordCount === 'number');
    const avgKeywords = validKwCounts.length
      ? validKwCounts.reduce((sum, s) => sum + s.keywordCount, 0) / validKwCounts.length
      : 0;

    const validTimes = searches.filter((s) => typeof s.executionTimeMs === 'number');
    const avgExecutionMs = validTimes.length
      ? validTimes.reduce((sum, s) => sum + s.executionTimeMs, 0) / validTimes.length
      : 0;

    const queryMap = new Map<string, number>();
    searches.forEach((s) => {
      const key = (s.productLabel || s.query || '').trim().toLowerCase();
      if (key) queryMap.set(key, (queryMap.get(key) || 0) + 1);
    });
    const topQueries = Array.from(queryMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalAttempts = searches.length + errors.length;
    const errorRate = totalAttempts ? (errors.length / totalAttempts) * 100 : 0;
    const saveRate = searches.length ? (saves.length / searches.length) * 100 : 0;
    const newUserCount = auths.filter((a) => a.isNewUser === true).length;

    // SEO Audit analytics
    const audits = filteredLogs.filter((l) => l.action === 'seo_audit');
    const auditErrors = filteredLogs.filter((l) => l.action === 'audit_error');
    const anonAudits = audits.filter((a) => a.userId === 'anonymous').length;
    const authAudits = audits.length - anonAudits;

    setAnalytics({
      searchCount: searches.length,
      errorCount: errors.length,
      errorRate,
      anonSearches,
      authSearches,
      paidSearches,
      freeSearches,
      avgKeywords,
      avgExecutionMs,
      saveCount: saves.length,
      saveRate,
      expandCount: expands.length,
      topQueries,
      signupCount: auths.length,
      newUserCount,
      auditCount: audits.length,
      auditErrorCount: auditErrors.length,
      anonAudits,
      authAudits,
    });

    // Compute conversion funnel
    const claimEvents = filteredLogs.filter((l) => l.action === 'claim');
    const proCount = planBreakdown.pro || 0;

    const funnelStages: FunnelStage[] = [
      { label: 'Anonymous Searches', count: anonSearches, pctOfTop: 100, pctOfPrev: 100, description: 'Visitors who tried the product without signing in' },
      { label: 'Sign-ups (New Users)', count: newUserCount, pctOfTop: 0, pctOfPrev: 0, description: 'Anon users who created an account' },
      { label: 'Authenticated Searches', count: authSearches, pctOfTop: 0, pctOfPrev: 0, description: 'Searches by signed-in users' },
      { label: 'Saves', count: saves.length, pctOfTop: 0, pctOfPrev: 0, description: 'Users who saved keyword results' },
      { label: 'Claims (Anon→Auth)', count: claimEvents.length, pctOfTop: 0, pctOfPrev: 0, description: 'Anon searches claimed after signing in' },
      { label: 'Paid Searches', count: paidSearches, pctOfTop: 0, pctOfPrev: 0, description: 'Searches that consumed credits or were Pro' },
      { label: 'Pro Subscribers', count: proCount, pctOfTop: 0, pctOfPrev: 0, description: 'Active Pro plan users' },
    ];

    const topCount = funnelStages[0].count || 1;
    funnelStages.forEach((stage, i) => {
      stage.pctOfTop = (stage.count / topCount) * 100;
      if (i > 0) {
        const prev = funnelStages[i - 1].count || 1;
        stage.pctOfPrev = (stage.count / prev) * 100;
      }
    });
    setFunnel(funnelStages);

    // Compute time series (last 30 days)
    const dayMap = new Map<string, DailyPoint>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, {
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        searches: 0,
        signups: 0,
        paid: 0,
        audits: 0,
      });
    }

    filteredLogs.forEach((log) => {
      const ts = log.timestamp;
      const d = ts instanceof Timestamp ? ts.toDate() : ts ? new Date(ts) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const point = dayMap.get(key);
      if (!point) return;
      if (log.action === 'search') {
        point.searches++;
        if (log.paid === true) point.paid++;
      } else if (log.action === 'seo_audit') {
        point.audits++;
      } else if (log.action === 'auth_init' && log.isNewUser === true) {
        point.signups++;
      }
    });

    setTimeSeries(Array.from(dayMap.values()));

    // Compute acquisition sources from user records
    const sourceMap = new Map<string, SourceRow>();
    filteredUsers.forEach((u) => {
      const attr = u.attribution || {};
      let source: string;
      let detail: string;

      // Classify referrer as search engine for legacy users without referrer_type
      const isSearchEngineRef = (ref: string) => {
        try {
          const h = new URL(ref).hostname.replace(/^www\./, '');
          return ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'yandex.com'].some((se) => h.includes(se));
        } catch { return false; }
      };

      if (attr.gclid) {
        source = 'Google Ads';
        detail = attr.utm_campaign || 'Search Network';
      } else if (attr.utm_source) {
        source = `${attr.utm_source}/${attr.utm_medium || 'unknown'}`;
        detail = attr.utm_campaign || '';
      } else if (attr.referrer_type === 'search' || (!attr.referrer_type && attr.referrer && isSearchEngineRef(attr.referrer))) {
        try {
          const hostname = new URL(attr.referrer).hostname.replace(/^www\./, '');
          source = 'Organic Search';
          detail = hostname;
        } catch {
          source = 'Organic Search';
          detail = '';
        }
      } else if (attr.referrer) {
        try {
          source = new URL(attr.referrer).hostname.replace(/^www\./, '');
          detail = 'referral';
        } catch {
          source = 'unknown referrer';
          detail = '';
        }
      } else {
        source = 'Direct';
        detail = '';
      }

      const key = `${source}|${detail}`;
      const row = sourceMap.get(key) || {
        source,
        detail,
        signups: 0,
        proCount: 0,
        payingCount: 0,
        conversionRate: 0,
      };
      row.signups++;
      if (u.plan === 'pro' || u.plan === 'agency') row.proCount++;
      const lifetimePurchased = u.credits?.lifetimePurchased || 0;
      if (lifetimePurchased > 0 || u.plan === 'pro' || u.plan === 'agency') row.payingCount++;
      sourceMap.set(key, row);
    });

    const sourceList = Array.from(sourceMap.values()).map((row) => ({
      ...row,
      conversionRate: row.signups ? (row.payingCount / row.signups) * 100 : 0,
    }));
    sourceList.sort((a, b) => b.signups - a.signups);
    setSources(sourceList);
  }, [rawData, excludeAdmin]);

  const fetchSearchConsole = useCallback(async (days: number, dimension: string) => {
    setScLoading(true);
    setScError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const resp = await fetch(`${API_URL}/api/admin/search-console?days=${days}&dimension=${dimension}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      setScData(await resp.json());
    } catch (err: any) {
      setScError(err.message);
      setScData(null);
    } finally {
      setScLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchSearchConsole(scDays, scDimension);
  }, [isAdmin, scDays, scDimension, fetchSearchConsole]);

  if (authLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeAdmin}
            onChange={(e) => setExcludeAdmin(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-jackpot-500 focus:ring-jackpot-500 focus:ring-offset-gray-950"
          />
          Exclude admin activity
        </label>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-center py-20">Loading stats...</div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Pro Subscribers" value={stats.planBreakdown.pro || 0} highlight />
            <StatCard label="Total Searches" value={stats.totalSearches} />
            <StatCard label="Free Searches Used" value={stats.totalFreeSearchesUsed} />
          </div>

          {/* Plan Breakdown */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Plan Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="text-gray-400 capitalize">{plan}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${plan === 'pro' ? 'bg-jackpot-500' : plan === 'agency' ? 'bg-purple-500' : 'bg-gray-600'}`}
                          style={{ width: `${stats.totalUsers ? (count / stats.totalUsers) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-white font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Credit Economy</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Credits Purchased</span>
                  <span className="text-white font-medium">{stats.totalCreditsPurchased}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Credits Used</span>
                  <span className="text-white font-medium">{stats.totalCreditsUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Free Searches Used</span>
                  <span className="text-white font-medium">{stats.totalFreeSearchesUsed}</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-3">
                  <span className="text-gray-400">Conversion Rate</span>
                  <span className="text-jackpot-400 font-medium">
                    {stats.totalUsers ? ((stats.planBreakdown.pro || 0) / stats.totalUsers * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Analytics */}
          {analytics && (
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-4">Search Analytics <span className="text-xs font-normal text-gray-500">(last 1,000 events)</span></h2>

              {/* Funnel cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Searches" value={analytics.searchCount} />
                <StatCard label="Anon vs Auth" value={analytics.anonSearches} subtext={`${analytics.authSearches} auth`} />
                <StatCard label="Paid vs Free" value={analytics.paidSearches} subtext={`${analytics.freeSearches} free`} />
                <StatCard label="Errors" value={analytics.errorCount} subtext={`${analytics.errorRate.toFixed(1)}% rate`} />
              </div>

              {/* SEO Audit stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="SEO Audits" value={analytics.auditCount} />
                <StatCard label="Audit Anon vs Auth" value={analytics.anonAudits} subtext={`${analytics.authAudits} auth`} />
                <StatCard label="Audit Errors" value={analytics.auditErrorCount} />
                <StatCard label="Total Actions" value={analytics.searchCount + analytics.auditCount} subtext="searches + audits" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Performance & Engagement */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Performance & Engagement</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Keywords per Search</span>
                      <span className="text-white font-medium">{Math.round(analytics.avgKeywords).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Execution Time</span>
                      <span className="text-white font-medium">{(analytics.avgExecutionMs / 1000).toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Saves</span>
                      <span className="text-white font-medium">{analytics.saveCount} <span className="text-gray-500 text-xs">({analytics.saveRate.toFixed(1)}%)</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expands</span>
                      <span className="text-white font-medium">{analytics.expandCount}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-800 pt-3">
                      <span className="text-gray-400">Sign-ins (events)</span>
                      <span className="text-white font-medium">{analytics.signupCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">New Sign-ups</span>
                      <span className="text-jackpot-400 font-medium">{analytics.newUserCount}</span>
                    </div>
                  </div>
                </div>

                {/* Top Queries */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Top Queries</h3>
                  {analytics.topQueries.length === 0 ? (
                    <p className="text-gray-500 text-sm">No queries logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.topQueries.map((q, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300 truncate flex-1 pr-3" title={q.query}>{q.query}</span>
                          <span className="text-jackpot-400 font-medium tabular-nums">{q.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Time Series Chart */}
          {timeSeries && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Daily Activity</h2>
                <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setChartRange(7)}
                    className={`px-3 py-1 text-xs rounded ${chartRange === 7 ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setChartRange(30)}
                    className={`px-3 py-1 text-xs rounded ${chartRange === 30 ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    30d
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <BarChart points={timeSeries.slice(-chartRange)} />
                <div className="mt-4 flex items-center gap-6 text-xs">
                  <LegendDot color="bg-blue-500" label="Searches" />
                  <LegendDot color="bg-jackpot-500" label="Paid Searches" />
                  <LegendDot color="bg-green-500" label="SEO Audits" />
                  <LegendDot color="bg-purple-500" label="New Sign-ups" />
                </div>
              </div>
            </div>
          )}

          {/* Conversion Funnel */}
          {funnel && (
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-4">Conversion Funnel <span className="text-xs font-normal text-gray-500">(visitor → paid)</span></h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="space-y-4">
                  {funnel.map((stage, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{stage.label}</span>
                          <span className="text-xs text-gray-500">{stage.description}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-white font-bold tabular-nums">{stage.count.toLocaleString()}</span>
                          {i > 0 && (
                            <span className={`text-xs tabular-nums ${stage.pctOfPrev >= 50 ? 'text-jackpot-400' : stage.pctOfPrev >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {stage.pctOfPrev.toFixed(1)}% of prev
                            </span>
                          )}
                          <span className="text-xs text-gray-500 tabular-nums w-14 text-right">
                            {stage.pctOfTop.toFixed(1)}% of top
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            i === 0 ? 'bg-gray-500' :
                            i === funnel.length - 1 ? 'bg-jackpot-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${Math.max(stage.pctOfTop, 0.5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Anon → Sign-up</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {funnel[0].count ? ((funnel[1].count / funnel[0].count) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Sign-up → Paid</div>
                    <div className="text-2xl font-bold text-white mt-1">
                      {funnel[1].count ? ((funnel[5].count / funnel[1].count) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Visitor → Pro</div>
                    <div className="text-2xl font-bold text-jackpot-400 mt-1">
                      {funnel[0].count ? ((funnel[6].count / funnel[0].count) * 100).toFixed(2) : '0.00'}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Acquisition Sources */}
          {sources && (
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-4">Acquisition Sources <span className="text-xs font-normal text-gray-500">(by user signup)</span></h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                {sources.length === 0 ? (
                  <p className="text-gray-500 text-sm">No attributed signups yet. Data appears as new users sign up via tracked links.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left px-3 py-2 text-gray-400 font-medium">Source</th>
                          <th className="text-left px-3 py-2 text-gray-400 font-medium">Campaign / Detail</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">Signups</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">Paying</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">Pro</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">Conv. Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sources.map((row, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            <td className="px-3 py-2 text-white font-medium">{row.source}</td>
                            <td className="px-3 py-2 text-gray-400 text-xs">{row.detail || '—'}</td>
                            <td className="px-3 py-2 text-right text-white tabular-nums">{row.signups}</td>
                            <td className="px-3 py-2 text-right text-white tabular-nums">{row.payingCount}</td>
                            <td className="px-3 py-2 text-right text-jackpot-400 tabular-nums">{row.proCount}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <span className={
                                row.conversionRate >= 10 ? 'text-jackpot-400' :
                                row.conversionRate > 0 ? 'text-yellow-400' :
                                'text-gray-500'
                              }>
                                {row.conversionRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Organic Search (Search Console) */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Organic Search <span className="text-xs font-normal text-gray-500">(Google Search Console)</span></h2>
              <div className="flex gap-2">
                <div className="flex bg-gray-800 rounded-lg overflow-hidden text-xs">
                  <button
                    onClick={() => setScDimension('query')}
                    className={`px-3 py-1.5 transition ${scDimension === 'query' ? 'bg-jackpot-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    By Query
                  </button>
                  <button
                    onClick={() => setScDimension('page')}
                    className={`px-3 py-1.5 transition ${scDimension === 'page' ? 'bg-jackpot-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    By Page
                  </button>
                </div>
                <div className="flex bg-gray-800 rounded-lg overflow-hidden text-xs">
                  <button
                    onClick={() => setScDays(7)}
                    className={`px-3 py-1.5 transition ${scDays === 7 ? 'bg-jackpot-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setScDays(28)}
                    className={`px-3 py-1.5 transition ${scDays === 28 ? 'bg-jackpot-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                  >
                    28d
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              {scLoading ? (
                <p className="text-gray-500 text-sm">Loading Search Console data...</p>
              ) : scError ? (
                <div className="text-sm">
                  <p className="text-red-400 mb-1">Search Console error</p>
                  <p className="text-gray-500">{scError}</p>
                  {scError.includes('not configured') && (
                    <p className="text-gray-500 mt-2">Add GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN to .env to enable this section.</p>
                  )}
                </div>
              ) : scData && scData.rows.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Clicks</div>
                      <div className="text-2xl font-bold text-white mt-1">{scData.totals.clicks.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Impressions</div>
                      <div className="text-2xl font-bold text-white mt-1">{scData.totals.impressions.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Avg CTR</div>
                      <div className="text-2xl font-bold text-white mt-1">{(scData.totals.ctr * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Position</div>
                      <div className="text-2xl font-bold text-white mt-1">{scData.totals.position.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left px-3 py-2 text-gray-400 font-medium">{scDimension === 'query' ? 'Query' : 'Page'}</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">Clicks</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">Impressions</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">CTR</th>
                          <th className="text-right px-3 py-2 text-gray-400 font-medium">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scData.rows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            <td className="px-3 py-2 text-white font-medium truncate max-w-xs">{row.keys[0]}</td>
                            <td className="px-3 py-2 text-right text-white tabular-nums">{row.clicks}</td>
                            <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{row.impressions.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{(row.ctr * 100).toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <span className={row.position <= 10 ? 'text-green-400' : row.position <= 20 ? 'text-yellow-400' : 'text-gray-500'}>
                                {row.position.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">No Search Console data yet — data typically appears 2-3 days after Google indexes your pages.</p>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Recent Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-3 py-2 text-gray-400 font-medium">Email</th>
                    <th className="text-left px-3 py-2 text-gray-400 font-medium">Plan</th>
                    <th className="text-left px-3 py-2 text-gray-400 font-medium">Joined</th>
                    <th className="text-right px-3 py-2 text-gray-400 font-medium">Searches</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((user, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="px-3 py-2 text-gray-300">{user.email}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.plan === 'pro' ? 'bg-jackpot-500/10 text-jackpot-400' :
                          user.plan === 'agency' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-400">{user.createdAt}</td>
                      <td className="px-3 py-2 text-right text-white">{user.searchCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6">
            <h2 className="text-lg font-bold mb-4">Activity Log</h2>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity logged yet. Logs will appear after the next search or sign-in.</p>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Time</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Action</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">{log.timestamp}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.action === 'search' ? 'bg-blue-500/10 text-blue-400' :
                            log.action === 'seo_audit' ? 'bg-green-500/10 text-green-400' :
                            log.action === 'audit_error' ? 'bg-red-500/10 text-red-400' :
                            log.action === 'search_error' ? 'bg-red-500/10 text-red-400' :
                            log.action === 'save' ? 'bg-green-500/10 text-green-400' :
                            log.action === 'claim' ? 'bg-jackpot-500/10 text-jackpot-400' :
                            log.action === 'auth_init' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-300 text-xs">
                          {log.action === 'search' && (
                            <>
                              <span className="text-gray-500">{log.userId === 'anonymous' ? 'anon' : log.userId?.slice(0, 8)}</span>
                              {' '}&mdash; {log.productLabel || log.query}
                              {log.inputType && (
                                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded ${
                                  log.inputType === 'url' ? 'bg-cyan-500/10 text-cyan-400' :
                                  log.inputType === 'both' ? 'bg-purple-500/10 text-purple-400' :
                                  'bg-gray-800 text-gray-500'
                                }`}>
                                  {log.inputType === 'url' ? 'URL' : log.inputType === 'both' ? 'DESC+URL' : 'DESC'}
                                </span>
                              )}
                              {' '}<span className="text-gray-500">({log.keywordCount} kw, {((log.executionTimeMs || 0) / 1000).toFixed(1)}s)</span>
                            </>
                          )}
                          {log.action === 'search_error' && (
                            <span className="text-red-400">{log.error}</span>
                          )}
                          {log.action === 'save' && (
                            <>
                              <span className="text-gray-500">{log.userId?.slice(0, 8)}</span>
                              {' '}&mdash; {log.query} <span className="text-gray-500">({log.keywordCount} kw)</span>
                            </>
                          )}
                          {log.action === 'claim' && (
                            <span className="text-gray-500">{log.userId?.slice(0, 8)} {log.paid ? '(paid)' : '(free)'}</span>
                          )}
                          {log.action === 'auth_init' && (
                            <>
                              {log.email} {log.isNewUser && <span className="text-green-400 ml-1">NEW</span>}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="mt-8 flex gap-4 text-sm">
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              Google Analytics &rarr;
            </a>
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              Search Console &rarr;
            </a>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              Stripe Dashboard &rarr;
            </a>
            <a
              href="https://console.firebase.google.com/project/even-plate-378520"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              Firebase Console &rarr;
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span className="text-gray-400">{label}</span>
    </div>
  );
}

function BarChart({ points }: { points: DailyPoint[] }) {
  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.searches, p.signups, p.audits)));
  const chartHeight = 180;
  const barGap = 2;
  const groupGap = 8;
  const groupCount = points.length;
  // 3 bars per group: searches, paid (overlay), signups
  // Use side-by-side: searches and signups, with paid as inner overlay on searches
  const totalGapWidth = (groupCount - 1) * groupGap;

  return (
    <div className="w-full">
      <div className="relative" style={{ height: chartHeight }}>
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <div
            key={frac}
            className="absolute left-0 right-0 border-t border-gray-800"
            style={{ top: `${(1 - frac) * chartHeight}px` }}
          >
            <span className="absolute -left-1 -top-2 text-[10px] text-gray-600 -translate-x-full pr-1">
              {Math.round(maxValue * frac)}
            </span>
          </div>
        ))}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end pl-6" style={{ gap: `${groupGap}px` }}>
          {points.map((p, i) => {
            const searchH = (p.searches / maxValue) * chartHeight;
            const paidH = (p.paid / maxValue) * chartHeight;
            const signupH = (p.signups / maxValue) * chartHeight;
            return (
              <div
                key={i}
                className="flex-1 flex items-end justify-center group relative"
                style={{ gap: `${barGap}px`, minWidth: 0 }}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-950 border border-gray-700 rounded px-2 py-1 text-[10px] whitespace-nowrap z-10 pointer-events-none">
                  <div className="text-gray-400">{p.label}</div>
                  <div className="text-blue-400">Searches: {p.searches}</div>
                  <div className="text-jackpot-400">Paid: {p.paid}</div>
                  <div className="text-green-400">Audits: {p.audits}</div>
                  <div className="text-purple-400">Sign-ups: {p.signups}</div>
                </div>

                {/* Searches bar (with paid overlay) */}
                <div className="relative flex-1 bg-blue-500/70 rounded-t-sm" style={{ height: `${searchH}px`, minHeight: p.searches > 0 ? '2px' : '0' }}>
                  {paidH > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-jackpot-500 rounded-t-sm"
                      style={{ height: `${paidH}px` }}
                    />
                  )}
                </div>
                {/* Audits bar */}
                <div
                  className="flex-1 bg-green-500/70 rounded-t-sm"
                  style={{ height: `${(p.audits / maxValue) * chartHeight}px`, minHeight: p.audits > 0 ? '2px' : '0' }}
                />
                {/* Sign-ups bar */}
                <div
                  className="flex-1 bg-purple-500 rounded-t-sm"
                  style={{ height: `${signupH}px`, minHeight: p.signups > 0 ? '2px' : '0' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels — visible labels are allowed to overflow their
          flex cell into neighboring empty cells, since we skip labels
          on the in-between days. Without overflow:visible the cells
          would be 1/30 of the chart width and truncate to "Ma..." */}
      <div className="flex pl-6 mt-2 overflow-visible" style={{ gap: `${groupGap}px` }}>
        {points.map((p, i) => {
          // Show every Nth label to avoid crowding
          const showLabel = points.length <= 7 || i % Math.ceil(points.length / 8) === 0 || i === points.length - 1;
          return (
            <div
              key={i}
              className="flex-1 text-center text-[10px] text-gray-600 whitespace-nowrap"
              style={{ minWidth: 0, overflow: 'visible' }}
            >
              {showLabel ? p.label : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight, subtext }: { label: string; value: number; highlight?: boolean; subtext?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className={`text-3xl font-bold ${highlight ? 'text-jackpot-400' : 'text-white'}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {subtext && <div className="text-xs text-gray-600 mt-0.5">{subtext}</div>}
    </div>
  );
}
