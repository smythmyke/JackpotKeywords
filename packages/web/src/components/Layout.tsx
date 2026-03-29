import { Outlet, Link } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

export default function Layout() {
  const { user, profile, credits, loading, signInWithGoogle, logout } = useAuthContext();

  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);
  const plan = profile?.plan || 'free';

  function getUserBadge() {
    if (isAdmin) return { label: 'Admin', color: 'bg-jackpot-500 text-black' };
    if (plan === 'agency') return { label: 'Agency', color: 'bg-purple-500 text-white' };
    if (plan === 'pro') return { label: 'Pro', color: 'bg-jackpot-500 text-black' };
    if (credits && credits.balance > 0) return { label: `${credits.balance} credits`, color: 'bg-gray-700 text-gray-300' };
    return null;
  }

  const badge = user ? getUserBadge() : null;

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-option2.png" alt="JackpotKeywords" className="h-[60px]" />
          </Link>
          <div className="flex items-center gap-6 text-base">
            <Link to="/pricing" className="text-gray-400 hover:text-white transition">
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/" className="text-jackpot-400 hover:text-jackpot-300 font-medium transition">
                  New Search
                </Link>
                <Link to="/account" className="text-gray-400 hover:text-white transition">
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-white transition"
                >
                  Sign Out
                </button>
                {badge && (
                  <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
                {profile?.photoURL && (
                  <img
                    src={profile.photoURL}
                    alt=""
                    className="w-7 h-7 rounded-full border border-gray-700"
                  />
                )}
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-medium px-4 py-1.5 rounded-lg transition"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
