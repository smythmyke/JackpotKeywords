import { Outlet, Link } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

export default function Layout() {
  const { user, profile, loading, signInWithGoogle, logout } = useAuthContext();

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="JackpotKeywords" className="h-10 rounded" />
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/pricing" className="text-gray-400 hover:text-white transition">
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/account" className="text-gray-400 hover:text-white transition">
                  Account
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-400 hover:text-white transition"
                >
                  Sign Out
                </button>
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
