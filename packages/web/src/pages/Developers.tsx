import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { trackSignUp } from '../services/analytics';

const SUPPORT_EMAIL = 'smythmyke@gmail.com';
const API_BASE = 'https://jackpotkeywords.web.app/api/v1';

interface CodeBlockProps {
  language?: string;
  children: string;
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can still select text manually */
    }
  };

  return (
    <div className="relative group">
      {language && (
        <div className="absolute right-16 top-2.5 text-[10px] uppercase tracking-wider text-gray-600 font-mono pointer-events-none">
          {language}
        </div>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded border border-gray-700 bg-gray-900/80 text-gray-400 hover:border-jackpot-500/60 hover:text-jackpot-400 transition opacity-60 group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 pr-20 overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

interface SignupResult {
  apiKey: string;
  balanceCents: number;
  customerId: string;
  newSignup: boolean;
}

function ApiSignupCard() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message || body.error || `Signup failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      setResult(body as SignupResult);
      if (body.newSignup) trackSignUp('api');
    } catch (err: any) {
      setError(err?.message || 'Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.apiKey) return;
    try {
      await navigator.clipboard.writeText(result.apiKey);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can still select the text manually */
    }
  };

  if (result) {
    return (
      <div className="bg-gradient-to-br from-jackpot-500/10 to-jackpot-500/5 border border-jackpot-500/30 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-400 text-lg">✓</span>
          <h2 className="text-2xl font-bold text-white">
            {result.newSignup ? 'Welcome — you\'re in.' : 'Welcome back — new key issued.'}
          </h2>
        </div>
        <p className="text-gray-300 mb-4">
          {result.newSignup ? (
            <>Your <span className="text-jackpot-300 font-semibold">${(result.balanceCents / 100).toFixed(2)} starter credit</span> is loaded. Save your key below — it's only shown once.</>
          ) : (
            <>Your previous key still works (unless you revoke it). New key shown below, only shown once.</>
          )}
        </p>

        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">
              Your API key
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-semibold text-jackpot-400 hover:text-jackpot-300 transition px-2 py-1 rounded border border-jackpot-500/30 hover:border-jackpot-500/60"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <code className="block text-xs text-jackpot-300 font-mono break-all select-all">
            {result.apiKey}
          </code>
        </div>

        <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-red-200">
            <span className="font-semibold">⚠ Save this key now.</span> We only store
            the sha256 hash — there is no way to recover the raw key. Drop it in your
            password manager or set it as an env var:{' '}
            <code className="font-mono text-red-100">export JK_KEY={result.apiKey.slice(0, 12)}…</code>
          </p>
        </div>

        <p className="text-sm text-gray-400 mb-2 font-medium">Try it now:</p>
        <CodeBlock language="bash">{`curl ${API_BASE}/me \\
  -H "Authorization: Bearer ${result.apiKey}"`}</CodeBlock>
        <p className="text-xs text-gray-500 mt-3">
          Need help? Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-jackpot-400 hover:underline">
            {SUPPORT_EMAIL}
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-jackpot-500/10 to-jackpot-500/5 border border-jackpot-500/30 rounded-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-2">Get your API key</h2>
      <p className="text-gray-300 mb-4">
        Self-serve. Enter your email, get a key and a{' '}
        <span className="text-jackpot-300 font-semibold">$5 starter credit</span>{' '}
        (no card, no expiration). That's it.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="bg-jackpot-500 hover:bg-jackpot-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-bold px-5 py-2.5 rounded-lg transition whitespace-nowrap"
        >
          {submitting ? 'Issuing key…' : 'Get API Key'}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-3">
        No verification email — your key works immediately. By signing up you agree to
        our <Link to="/terms" className="text-jackpot-400 hover:underline">Terms</Link>{' '}
        and <Link to="/privacy" className="text-jackpot-400 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}

export default function Developers() {
  return (
    <>
      <Helmet>
        <title>API for Developers — JackpotKeywords</title>
        <meta
          name="description"
          content="REST API for AI-powered keyword research and AI-visibility scans. Composite Jackpot Score, real Google Ads data, $0.10/recommend, $1.00/aeo-scan. $5 free credit, no card required."
        />
        <link rel="canonical" href="https://jackpotkeywords.web.app/developers" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">JackpotKeywords API</h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Pipe the same keyword research and AI-visibility scans that power
            jackpotkeywords.com into your own product, agency workflow, or
            automation stack. One REST surface, two endpoints today, pay-as-you-go.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#signup"
              className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2.5 rounded-lg transition"
            >
              Get API Key — $5 free
            </a>
            <a
              href="#endpoints"
              className="text-jackpot-400 hover:text-jackpot-300 font-medium transition px-3 py-2.5"
            >
              See endpoints &rarr;
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Self-serve, no card required. $5 starter credit is enough for 50
            recommend calls or 5 AEO scans.
          </p>
        </div>

        <div className="space-y-14 text-gray-300 text-sm leading-relaxed">
          {/* Endpoints overview */}
          <section id="endpoints">
            <h2 className="text-2xl font-bold text-white mb-2">Endpoints</h2>
            <p className="text-gray-500 mb-5">
              Two endpoints live today. A third (<code className="text-jackpot-300 font-mono">/v1/score</code>) is
              held until we've collected enough real traffic to validate it
              against our composite-scoring reversibility test.
            </p>

            <div className="space-y-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <h3 className="font-mono text-white">
                    <span className="text-jackpot-400">POST</span> /v1/recommend
                  </h3>
                  <span className="text-jackpot-300 font-bold text-base">$0.10 / call</span>
                </div>
                <p className="text-gray-400">
                  Full keyword research pipeline — context extraction, seed
                  generation, autocomplete expansion, Google Ads enrichment,
                  trend analysis, AI relevance scoring. Returns recommendations
                  ranked by composite Jackpot Score.
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Latency: ~60–180s. Limit configurable up to 200 results.
                  Refunded on pipeline failure.
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <h3 className="font-mono text-white">
                    <span className="text-jackpot-400">POST</span> /v1/aeo-scan
                  </h3>
                  <span className="text-jackpot-300 font-bold text-base">$1.00 / scan</span>
                </div>
                <p className="text-gray-400">
                  AI-visibility check. Runs 10 buyer-intent queries against
                  Gemini grounded search + Serper, reports cited / mentioned /
                  missing per query plus the top sources the AI cited.
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Latency: ~30–120s. Refunded on failure.
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 opacity-70">
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <h3 className="font-mono text-gray-400">
                    <span className="text-gray-500">POST</span> /v1/score
                  </h3>
                  <span className="text-gray-500 font-bold text-base">Held back</span>
                </div>
                <p className="text-gray-500">
                  Per-keyword composite scoring. Held until we've collected
                  enough real recommend traffic to validate the score isn't
                  reverse-engineerable. Need it early for a specific use case?{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-jackpot-400 hover:underline">
                    Email us
                  </a>{' '}
                  — we can issue a rate-limited preview.
                </p>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section id="auth">
            <h2 className="text-2xl font-bold text-white mb-2">Authentication</h2>
            <p className="text-gray-400 mb-5">
              Sign up returns an API key prefixed{' '}
              <code className="text-jackpot-300 font-mono">jk_live_</code>{' '}
              plus a $5 starter credit (no card, no expiration). Authenticate
              with <code className="text-jackpot-300 font-mono">Authorization: Bearer …</code> on
              every request. The raw key is shown once at creation — store it
              immediately.
            </p>
            <CodeBlock language="bash">{`# Sign up (returns your first key)
curl -X POST ${API_BASE}/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com"}'

# Check balance
curl ${API_BASE}/me \\
  -H "Authorization: Bearer $JK_KEY"`}</CodeBlock>
            <p className="text-xs text-gray-600 mt-3">
              You can mint additional named keys per environment via{' '}
              <code className="text-jackpot-300 font-mono">POST /v1/keys</code>, list them
              with <code className="text-jackpot-300 font-mono">GET /v1/keys</code>, and revoke
              any key with <code className="text-jackpot-300 font-mono">DELETE /v1/keys/:keyId</code>.
            </p>
          </section>

          {/* /v1/recommend */}
          <section id="recommend">
            <h2 className="text-2xl font-bold text-white mb-2">
              <span className="font-mono text-jackpot-400 text-lg">POST</span>{' '}
              <code className="font-mono">/v1/recommend</code>
            </h2>
            <p className="text-gray-400 mb-5">
              Pass a URL, a description, or both. The pipeline grounds itself in
              your product context, generates seeds, expands them via
              autocomplete, enriches with Google Ads data, and scores by composite
              Jackpot Score (volume, CPC, competition, trend, cluster strength,
              AI relevance).
            </p>
            <CodeBlock language="bash">{`curl -X POST ${API_BASE}/recommend \\
  -H "Authorization: Bearer $JK_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourproduct.com",
    "description": "AI-powered keyword research tool for indie makers",
    "limit": 25
  }'`}</CodeBlock>
            <p className="text-gray-400 mt-5 mb-2">Response (truncated):</p>
            <CodeBlock language="json">{`{
  "recommendations": [
    {
      "keyword": "ebay bulk listing tool",
      "monthlyVolume": 720,
      "lowCpc": 1.42,
      "highCpc": 4.18,
      "competition": "LOW",
      "trendDirection": "UP",
      "jackpotScore": 88,
      "aiRelevance": 9,
      "intent": "commercial",
      "category": "competitor"
    }
  ],
  "balanceCents": 490
}`}</CodeBlock>
            <p className="text-xs text-gray-600 mt-3">
              <code className="text-jackpot-300 font-mono">limit</code> defaults to 50, max 200.
              Cost is flat $0.10 regardless of <code className="text-jackpot-300 font-mono">limit</code>.
            </p>
          </section>

          {/* /v1/aeo-scan */}
          <section id="aeo-scan">
            <h2 className="text-2xl font-bold text-white mb-2">
              <span className="font-mono text-jackpot-400 text-lg">POST</span>{' '}
              <code className="font-mono">/v1/aeo-scan</code>
            </h2>
            <p className="text-gray-400 mb-5">
              Runs 10 buyer-intent queries about your product through Gemini's
              grounded search. For each query you get the AI's answer snippet,
              whether your URL was cited or just mentioned, and the top sources
              the AI ranked above you.
            </p>
            <CodeBlock language="bash">{`curl -X POST ${API_BASE}/aeo-scan \\
  -H "Authorization: Bearer $JK_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yourproduct.com"}'`}</CodeBlock>
            <p className="text-gray-400 mt-5 mb-2">Response (truncated):</p>
            <CodeBlock language="json">{`{
  "visibilityScore": 10,
  "queriesChecked": 10,
  "queriesCited": 0,
  "queriesMentioned": 1,
  "queries": [
    {
      "query": "best ebay bulk listing tool",
      "productCited": false,
      "productMentionedInAnswer": false,
      "answerSnippet": "Top tools include InkFrog, ListPerfectly...",
      "citations": [{ "url": "..." }]
    }
  ],
  "balanceCents": 390
}`}</CodeBlock>
            <p className="text-xs text-gray-600 mt-3">
              Per Gemini's terms, callers that surface this data in a
              user-facing UI must render Google's{' '}
              <code className="text-jackpot-300 font-mono">searchEntryPoint</code> HTML alongside
              the results. Email if you're wiring this into a customer product.
            </p>
          </section>

          {/* Pricing */}
          <section id="pricing">
            <h2 className="text-2xl font-bold text-white mb-2">Pricing & topup</h2>
            <p className="text-gray-400 mb-5">
              Pay-as-you-go. No monthly minimum, no seat fees, no annual
              contract.
            </p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="px-5 py-3 text-gray-400">Signup credit</td>
                    <td className="px-5 py-3 text-jackpot-300 font-semibold text-right">$5.00 (no expiration)</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="px-5 py-3 text-gray-400">
                      <code className="font-mono text-jackpot-300">/v1/recommend</code>
                    </td>
                    <td className="px-5 py-3 text-white font-semibold text-right">$0.10 / call</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="px-5 py-3 text-gray-400">
                      <code className="font-mono text-jackpot-300">/v1/aeo-scan</code>
                    </td>
                    <td className="px-5 py-3 text-white font-semibold text-right">$1.00 / scan</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-400">Topup packs</td>
                    <td className="px-5 py-3 text-white text-right">$25 / $100 / $500 (or custom &ge; $25)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Topup via{' '}
              <code className="text-jackpot-300 font-mono">POST /v1/topup</code> returns a
              Stripe Checkout URL. Pipeline failures auto-refund.
            </p>
          </section>

          {/* Rate limits */}
          <section id="rate-limits">
            <h2 className="text-2xl font-bold text-white mb-2">Rate limits</h2>
            <p className="text-gray-400">
              Per key: <span className="text-white font-semibold">60 requests/min</span>{' '}
              and <span className="text-white font-semibold">1,000 requests/hour</span>,
              sliding window. If you hit a 429 unexpectedly or need a higher
              ceiling, email us — limits can scale up on request.
            </p>
          </section>

          {/* What's coming */}
          <section id="roadmap">
            <h2 className="text-2xl font-bold text-white mb-2">What's coming</h2>
            <ul className="space-y-2 text-gray-400">
              <li>
                <span className="text-white font-medium">MCP server</span> —
                wraps the same endpoints for Claude, Cursor, Windsurf, and any
                MCP-compatible agent. Distributed via npm + MCP Registry.
              </li>
              <li>
                <span className="text-white font-medium">
                  <code className="font-mono text-jackpot-300">/v1/score</code> endpoint
                </span>{' '}
                — once we've validated against our reversibility test on real
                traffic. Email us if you need batch scoring earlier.
              </li>
              <li>
                <span className="text-white font-medium">n8n community node</span>{' '}
                — for ops folks wiring this into existing workflows.
              </li>
            </ul>
          </section>

          {/* Self-serve signup */}
          <section id="signup">
            <ApiSignupCard />
          </section>
        </div>

        <div className="mt-14 pt-8 border-t border-gray-800 text-center">
          <Link to="/" className="text-jackpot-400 hover:underline text-sm">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
