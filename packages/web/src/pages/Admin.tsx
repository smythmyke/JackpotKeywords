import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthContext } from '../contexts/AuthContext';

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

interface ActivityLog {
  action: string;
  userId?: string;
  email?: string;
  query?: string;
  productLabel?: string;
  keywordCount?: number;
  executionTimeMs?: number;
  paid?: boolean;
  error?: string;
  isNewUser?: boolean;
  timestamp: string;
}

export default function Admin() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = (profile?.email && ADMIN_EMAILS.includes(profile.email)) || (user?.email && ADMIN_EMAILS.includes(user.email));

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    async function loadStats() {
      try {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500))
        );

        let totalUsers = 0;
        const planBreakdown: Record<string, number> = { free: 0, pro: 0, agency: 0 };
        let totalSearches = 0;
        let totalCreditsUsed = 0;
        let totalCreditsPurchased = 0;
        let totalFreeSearchesUsed = 0;
        const recentUsers: Stats['recentUsers'] = [];

        usersSnap.forEach((doc) => {
          const data = doc.data();
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

        // Fetch activity logs
        const logsSnap = await getDocs(
          query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(100))
        );
        const logEntries: ActivityLog[] = [];
        logsSnap.forEach((doc) => {
          const data = doc.data();
          logEntries.push({
            ...data,
            timestamp: data.timestamp instanceof Timestamp
              ? data.timestamp.toDate().toLocaleString()
              : data.timestamp || '',
          } as ActivityLog);
        });
        setLogs(logEntries);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [authLoading, isAdmin]);

  if (authLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

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

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className={`text-3xl font-bold ${highlight ? 'text-jackpot-400' : 'text-white'}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
