import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

export default function Layout() {
  const { user, profile, credits, loading, signInWithGoogle, logout } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasKeywordResults, setHasKeywordResults] = useState(false);
  const [keywordResultsPath, setKeywordResultsPath] = useState('');
  const [hasAuditResults, setHasAuditResults] = useState(false);
  const [auditResultsPath, setAuditResultsPath] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [resultsDropdownOpen, setResultsDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isOnResultsPage = location.pathname.startsWith('/results') || location.pathname.startsWith('/seo-audit/results');

  useEffect(() => {
    const cachedKeywords = sessionStorage.getItem('jk_results');
    const keywordPath = sessionStorage.getItem('jk_results_path');
    setHasKeywordResults(!!cachedKeywords);
    setKeywordResultsPath(keywordPath || '/results/anonymous');

    const cachedAudit = sessionStorage.getItem('jk_audit_results');
    const auditPath = sessionStorage.getItem('jk_audit_results_path');
    setHasAuditResults(!!cachedAudit);
    setAuditResultsPath(auditPath || '/seo-audit/results/anonymous');
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setResultsDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen && !resultsDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setResultsDropdownOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setResultsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen, resultsDropdownOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const isAdmin = (profile?.email && ADMIN_EMAILS.includes(profile.email)) || (user?.email && ADMIN_EMAILS.includes(user.email));
  const plan = profile?.plan || 'free';

  function getUserBadge() {
    if (isAdmin) return { label: 'Admin', color: 'bg-jackpot-500 text-black' };
    if (plan === 'agency') return { label: 'Agency', color: 'bg-purple-500 text-white' };
    if (plan === 'pro') return { label: 'Pro', color: 'bg-jackpot-500 text-black' };
    if (credits && credits.balance > 0) return { label: `${credits.balance} credits`, color: 'bg-gray-700 text-gray-300' };
    return null;
  }

  const badge = user ? getUserBadge() : null;
  const hasAnyResults = hasKeywordResults || hasAuditResults;
  const hasBothResults = hasKeywordResults && hasAuditResults;

  // If only one result type, link directly; if both, show dropdown
  const singleResultPath = hasKeywordResults ? keywordResultsPath : auditResultsPath;

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-header.png" alt="JackpotKeywords" className="h-[50px]" />
          </Link>
          <div className="flex items-center gap-6 text-base">
            <Link to="/pricing" className="text-gray-400 hover:text-white transition">
              Pricing
            </Link>
            <Link to="/seo-audit" className="text-gray-400 hover:text-white transition">
              SEO Audit
            </Link>
            <Link to="/blog" className="text-gray-400 hover:text-white transition">
              Blog
            </Link>
            {hasAnyResults && !isOnResultsPage && (
              hasBothResults ? (
                // Dropdown for both result types
                <div className="relative" ref={resultsRef}>
                  <button
                    onMouseEnter={() => setResultsDropdownOpen(true)}
                    onClick={() => setResultsDropdownOpen((v) => !v)}
                    className="text-jackpot-400 hover:text-jackpot-300 font-medium transition flex items-center gap-1"
                  >
                    Results
                    <svg className="w-3.5 h-3.5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {resultsDropdownOpen && (
                    <div
                      onMouseLeave={() => setResultsDropdownOpen(false)}
                      className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1 z-50"
                    >
                      <Link
                        to={keywordResultsPath}
                        onClick={() => setResultsDropdownOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                      >
                        Keyword Results
                      </Link>
                      <Link
                        to={auditResultsPath}
                        onClick={() => setResultsDropdownOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition border-t border-gray-800"
                      >
                        SEO Audit Results
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                // Direct link for single result type
                <Link to={singleResultPath} className="text-jackpot-400 hover:text-jackpot-300 font-medium transition">
                  Results
                </Link>
              )
            )}
            {user ? (
              <>
                <Link to="/" className="text-jackpot-400 hover:text-jackpot-300 font-medium transition">
                  New Search
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white transition"
                >
                  Sign Out
                </button>
                {badge && (
                  <span className={`text-[13px] font-bold px-3 py-1 rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Open account menu"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-jackpot-500"
                  >
                    {profile?.photoURL ? (
                      <img
                        src={profile.photoURL}
                        alt=""
                        className="w-8 h-8 rounded-full border border-gray-700 hover:border-jackpot-500 transition"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-gray-700 hover:border-jackpot-500 bg-gray-800 flex items-center justify-center text-sm text-gray-300 transition">
                        {(profile?.email || user.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-52 rounded-lg border border-gray-800 bg-gray-900 shadow-xl py-1 z-50"
                    >
                      {(profile?.email || user.email) && (
                        <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-500 truncate">
                          {profile?.email || user.email}
                        </div>
                      )}
                      <Link
                        to="/account"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                      >
                        Account
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                        >
                          Admin
                        </Link>
                      )}
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition border-t border-gray-800"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
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
