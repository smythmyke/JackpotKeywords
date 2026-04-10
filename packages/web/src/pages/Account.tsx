import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { listSearches } from '../services/api';
import { trackPurchase, trackSubscription } from '../services/analytics';

interface SavedSearch {
  id: string;
  query: string;
  productLabel?: string;
  mode: string;
  paid: boolean;
  createdAt: string;
  totalKeywords: number;
}

export default function Account() {
  const { user, profile, credits, loading: authLoading, signInWithGoogle } = useAuthContext();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const { getToken } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // Track Stripe return conversions
  useEffect(() => {
    if (searchParams.get('purchase') === 'success') {
      trackPurchase(1.99, 'USD', 'credit_pack');
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('subscribe') === 'success') {
      trackSubscription('pro', 9.99);
      trackPurchase(9.99, 'USD', 'pro_subscription');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchSearches() {
      setLoadingSearches(true);
      try {
        const token = await getToken();
        if (!token) return;
        const data = await listSearches(token);
        setSearches(data.searches || []);
      } catch {
        // silent
      } finally {
        setLoadingSearches(false);
      }
    }
    fetchSearches();
  }, [user, authLoading, getToken]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-8">Account</h1>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-400 mb-4">Sign in to view your account, saved searches, and credits.</p>
          <button
            onClick={signInWithGoogle}
            className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Account</h1>

      {/* Profile card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
        <div className="flex items-center gap-4">
          {profile?.photoURL && (
            <img src={profile.photoURL} alt="" className="w-14 h-14 rounded-full border-2 border-gray-700" />
          )}
          <div>
            <div className="text-lg font-bold text-white">{profile?.displayName || profile?.email}</div>
            <div className="text-sm text-gray-400">{profile?.email}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wider">Plan</div>
            <div className="text-jackpot-400 font-bold capitalize">{profile?.plan || 'Free'}</div>
          </div>
        </div>

        {credits && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800">
            <div>
              <div className="text-xs text-gray-500">Credit Balance</div>
              <div className="text-xl font-bold text-white">{credits.balance}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Free Searches Used</div>
              <div className="text-xl font-bold text-white">{credits.freeSearchesUsed} / 3</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Searches</div>
              <div className="text-xl font-bold text-white">{credits.lifetimeUsed + credits.freeSearchesUsed}</div>
            </div>
          </div>
        )}
      </div>

      {/* Saved searches */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Saved Searches</h2>
        {loadingSearches && (
          <div className="text-gray-400 py-8 text-center">Loading searches...</div>
        )}
        {!loadingSearches && searches.length === 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
            <p className="text-gray-400 mb-4">No searches yet. Run your first keyword search!</p>
            <Link
              to="/"
              className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition"
            >
              Find Goldmine Keywords
            </Link>
          </div>
        )}
        {!loadingSearches && searches.length > 0 && (
          <div className="space-y-2">
            {searches.map((search) => (
              <Link
                key={search.id}
                to={`/results/${search.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">
                      {search.productLabel || search.query || 'Keyword Search'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDate(search.createdAt)} &middot; {search.totalKeywords} keywords saved
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {search.query && (
                      <Link
                        to="/"
                        state={{ prefillQuery: search.query }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-gray-800 text-gray-400 hover:text-white px-2 py-1 rounded transition"
                      >
                        Re-run
                      </Link>
                    )}
                    {search.paid && (
                      <span className="text-xs bg-jackpot-500/20 text-jackpot-400 px-2 py-1 rounded">Full</span>
                    )}
                    {!search.paid && (
                      <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded">Free</span>
                    )}
                    <span className="text-gray-600">&rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
