import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const BETA_EMAIL = 'smythmyke@gmail.com';
const MAILTO = `mailto:${BETA_EMAIL}?subject=JackpotKeywords%20API%20%E2%80%94%20beta%20access%20request&body=Hi%20Michael%2C%0A%0AI%27d%20like%20to%20try%20the%20JackpotKeywords%20API%20during%20the%20private%20beta.%0A%0AAbout%20me%2Fmy%20project%3A%0A%0AWhat%20I%27d%20use%20it%20for%3A%0A%0AThanks!`;

interface CodeBlockProps {
  language?: string;
  children: string;
}

function CodeBlock({ language, children }: CodeBlockProps) {
  return (
    <div className="relative">
      {language && (
        <div className="absolute right-3 top-2 text-[10px] uppercase tracking-wider text-gray-600 font-mono">
          {language}
        </div>
      )}
      <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
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
          content="REST API for AI-powered keyword research and AI-visibility scans. Composite Jackpot Score, real Google Ads data, $0.10/recommend, $1.00/aeo-scan. Private beta — request access."
        />
        <link rel="canonical" href="https://jackpotkeywords.web.app/developers" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-jackpot-500/10 border border-jackpot-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-jackpot-400 shadow-[0_0_8px_#fbbf24]" />
            <span className="text-xs font-semibold text-jackpot-400 uppercase tracking-wider">
              Private Beta
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">JackpotKeywords API</h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Pipe the same keyword research and AI-visibility scans that power
            jackpotkeywords.com into your own product, agency workflow, or
            automation stack. One REST surface, three endpoints, pay-as-you-go.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={MAILTO}
              className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2.5 rounded-lg transition"
            >
              Request Beta Access
            </a>
            <a
              href="#endpoints"
              className="text-jackpot-400 hover:text-jackpot-300 font-medium transition px-3 py-2.5"
            >
              See endpoints &rarr;
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Beta is invite-only while we onboard the first design partners.
            Self-serve signup opens at public launch (~July–August 2026).
          </p>
        </div>

        <div className="space-y-14 text-gray-300 text-sm leading-relaxed">
          {/* Endpoints overview */}
          <section id="endpoints">
            <h2 className="text-2xl font-bold text-white mb-2">Endpoints</h2>
            <p className="text-gray-500 mb-5">
              Two public endpoints today. A third (<code className="text-jackpot-300 font-mono">/v1/score</code>) opens
              after a reversibility test passes in late 2026.
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
                  <span className="text-gray-500 font-bold text-base">Coming after Aug 2026</span>
                </div>
                <p className="text-gray-500">
                  Score individual keyword candidates by composite metric.
                  Held until our month-3 reversibility validation completes.
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
curl -X POST https://jackpotkeywords.web.app/api/v1/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com"}'

# Check balance
curl https://jackpotkeywords.web.app/api/v1/me \\
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
            <CodeBlock language="bash">{`curl -X POST https://jackpotkeywords.web.app/api/v1/recommend \\
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
            <CodeBlock language="bash">{`curl -X POST https://jackpotkeywords.web.app/api/v1/aeo-scan \\
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
              ceiling, tell us — limits scale with warm-instance count during
              the beta.
            </p>
          </section>

          {/* What's coming */}
          <section id="roadmap">
            <h2 className="text-2xl font-bold text-white mb-2">What's coming</h2>
            <ul className="space-y-2 text-gray-400">
              <li>
                <span className="text-white font-medium">MCP server</span> —
                wraps the same endpoints for Claude, Cursor, Windsurf, and any
                MCP-compatible agent.
              </li>
              <li>
                <span className="text-white font-medium">Google Sheets add-on</span> —
                for non-developer users running keyword research from a
                spreadsheet.
              </li>
              <li>
                <span className="text-white font-medium">
                  <code className="font-mono text-jackpot-300">/v1/score</code> endpoint
                </span>{' '}
                — once month-3 reversibility validation passes (~August 2026).
              </li>
              <li>
                <span className="text-white font-medium">n8n / Zapier / Make.com</span>{' '}
                nodes — for ops folks wiring this into existing workflows.
              </li>
            </ul>
          </section>

          {/* Get access */}
          <section id="access" className="bg-gradient-to-br from-jackpot-500/10 to-jackpot-500/5 border border-jackpot-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-2">Get beta access</h2>
            <p className="text-gray-300 mb-4">
              Email us a sentence or two about what you'd use the API for. We're
              onboarding a small set of design partners to shake out billing,
              auth, and recommendation quality before opening signups publicly.
            </p>
            <a
              href={MAILTO}
              className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-5 py-2.5 rounded-lg transition"
            >
              Request Beta Access
            </a>
            <p className="text-xs text-gray-500 mt-3">
              Or email{' '}
              <a href={`mailto:${BETA_EMAIL}`} className="text-jackpot-400 hover:underline">
                {BETA_EMAIL}
              </a>{' '}
              directly.
            </p>
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
