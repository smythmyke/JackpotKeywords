import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuthContext } from '../contexts/AuthContext';
import { runSeoAudit } from '../services/api';

const PROGRESS_STEPS = [
  'Connecting to your website...',
  'Analyzing page structure...',
  'Checking SEO fundamentals...',
  'Scanning additional pages...',
  'Generating recommendations...',
];

export default function SeoAuditInput() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, getToken } = useAuthContext();

  // Pre-fill URL from query param (cross-link from Results page)
  useEffect(() => {
    const prefill = searchParams.get('url');
    if (prefill) setUrl(prefill);
  }, [searchParams]);

  // Progress animation during audit
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgressStep((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 8000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate URL
    let normalized = url.trim();
    if (!normalized) {
      setError('Please enter a URL');
      return;
    }
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    try {
      new URL(normalized);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    setProgressStep(0);

    try {
      const token = user ? await getToken() : null;
      const result = await runSeoAudit(token, { url: normalized });
      navigate('/seo-audit/results/anonymous', { state: { result } });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>SEO Audit — JackpotKeywords</title>
        <meta name="description" content="Enter your website URL for a free AI-powered SEO audit. Check 20+ ranking factors in under 2 minutes." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">SEO Audit</h1>
          <p className="text-gray-400 text-lg">
            Enter your website URL and we&apos;ll analyze 20+ SEO factors across your site.
          </p>
        </div>

        {!loading ? (
          <form onSubmit={handleAudit} className="space-y-6">
            <div>
              <label htmlFor="audit-url" className="block text-sm font-medium text-gray-300 mb-2">
                Website URL
              </label>
              <input
                id="audit-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., markitup.app or https://example.com"
                className="w-full px-4 py-3.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500 outline-none text-lg"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
            >
              Start SEO Audit
            </button>

            <p className="text-center text-sm text-gray-500">
              Free audit with preview. Full report from $1.99 or included with{' '}
              <Link to="/pricing" className="text-jackpot-400 hover:underline">Pro</Link>.
            </p>
          </form>
        ) : (
          <div className="text-center py-12">
            {/* Progress spinner */}
            <div className="inline-block mb-8">
              <svg className="animate-spin h-12 w-12 text-jackpot-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>

            {/* Progress steps */}
            <div className="space-y-3 max-w-sm mx-auto text-left">
              {PROGRESS_STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
                    i < progressStep ? 'text-green-400' : i === progressStep ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {i < progressStep ? (
                    <span className="text-green-400 shrink-0">&#10003;</span>
                  ) : i === progressStep ? (
                    <span className="text-jackpot-400 shrink-0 animate-pulse">&#9679;</span>
                  ) : (
                    <span className="text-gray-600 shrink-0">&#9675;</span>
                  )}
                  {step}
                </div>
              ))}
            </div>

            <p className="text-gray-500 text-sm mt-8">
              This usually takes 30-90 seconds depending on site size.
            </p>
          </div>
        )}

        {/* Cross-link */}
        <div className="mt-12 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition">
            Looking for keyword research instead? &rarr;
          </Link>
        </div>
      </div>
    </>
  );
}
