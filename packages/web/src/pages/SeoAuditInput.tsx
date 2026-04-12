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

const FEATURES = [
  {
    title: 'Technical Foundation',
    desc: 'Title tags, meta descriptions, heading hierarchy, HTTPS, viewport, and canonical URLs.',
    badge: 'Core',
  },
  {
    title: 'Content Structure',
    desc: 'Content depth, blog presence, about page, and internal linking analysis.',
    badge: 'Content',
  },
  {
    title: 'Structured Data',
    desc: 'JSON-LD detection and missing schema opportunities for rich results.',
    badge: 'Rich Results',
  },
  {
    title: 'Crawlability & Bot Access',
    desc: 'robots.txt, sitemap.xml, noindex tags, and JavaScript rendering checks.',
    badge: 'Critical',
  },
  {
    title: 'Local & Geo SEO',
    desc: 'LocalBusiness schema, NAP consistency, and location signals.',
    badge: 'Local',
  },
  {
    title: 'Social & Sharing',
    desc: 'Open Graph and Twitter Card tag validation.',
    badge: 'Social',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Enter Your URL',
    desc: 'Type your website address. We analyze your page plus up to 8 additional pages.',
    icon: '\uD83C\uDF10',
  },
  {
    num: '2',
    title: 'AI Analyzes Everything',
    desc: '20+ SEO factors scored across 6 categories. Sitemap, robots.txt, structured data verified.',
    icon: '\uD83E\uDD16',
  },
  {
    num: '3',
    title: 'Get Your Report',
    desc: 'Scored checklist with specific recommendations sorted by impact.',
    icon: '\uD83D\uDCCA',
  },
];

const COMPARISON_FEATURES = [
  'Price',
  'AI-powered analysis',
  'Keyword gap detection',
  'Structured data audit',
  'Crawlability check',
  'Prioritized recommendations',
  'No technical expertise needed',
];

const COMPARISON_DATA: Record<string, string[]> = {
  'JackpotKeywords': ['$1.99', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
  'Ahrefs':          ['$99/mo', 'No', 'Separate', 'Basic', 'Yes', 'No', 'No'],
  'SEMrush':         ['$140/mo', 'No', 'Separate', 'Basic', 'Yes', 'Partial', 'No'],
  'Screaming Frog':  ['$259/yr', 'No', 'No', 'Yes', 'Yes', 'No', 'No'],
};

const TOOLS = Object.keys(COMPARISON_DATA);

const FAQS = [
  {
    q: 'What does the SEO audit check?',
    a: 'We analyze 20+ ranking factors across 6 categories: technical SEO (title tags, meta descriptions, headings, HTTPS), content structure (word count, blog, internal links), structured data (JSON-LD), crawlability (robots.txt, sitemap, JavaScript rendering), local SEO, and social sharing tags.',
  },
  {
    q: 'How many pages does the audit analyze?',
    a: 'We deep-analyze the URL you provide, then discover and scan up to 8 additional pages from your sitemap or internal links.',
  },
  {
    q: 'How is this different from Google Search Console?',
    a: "Google Search Console shows you what Google already knows about your site. Our audit proactively checks what's wrong and tells you exactly how to fix it — with prioritized recommendations and keyword gap opportunities.",
  },
  {
    q: 'Do I need technical knowledge to use this?',
    a: "No. We score every factor with pass/warning/fail indicators and provide plain-English recommendations. You'll know exactly what to do, even if you've never touched SEO before.",
  },
  {
    q: 'Can I audit any website?',
    a: 'Yes — you can audit your own site or any publicly accessible website. Some sites behind authentication or Cloudflare challenges may return partial results.',
  },
  {
    q: "What's included in the free audit vs the full report?",
    a: 'The free audit shows all check statuses (pass/warning/fail) so you know what needs attention. Sign in to unlock specific fix recommendations and keyword gap opportunities.',
  },
];

export default function SeoAuditInput() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, getToken } = useAuthContext();

  useEffect(() => {
    const prefill = searchParams.get('url');
    if (prefill) setUrl(prefill);
  }, [searchParams]);

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
      setError('Please enter a valid URL (e.g., markitup.app or https://example.com)');
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

  // Loading state — full-screen progress
  if (loading) {
    return (
      <>
        <Helmet>
          <title>Auditing... — JackpotKeywords</title>
        </Helmet>
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
          <div className="inline-block mb-8">
            <svg className="animate-spin h-12 w-12 text-jackpot-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
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
          <p className="text-gray-500 text-sm mt-8">This usually takes 30-90 seconds depending on site size.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Free SEO Audit Tool — JackpotKeywords</title>
        <meta name="description" content="Audit your website's SEO in 60 seconds. Check title tags, meta descriptions, structured data, crawlability, and more. AI-powered analysis with specific fix recommendations." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/seo-audit" />
        <meta property="og:title" content="Free SEO Audit Tool — JackpotKeywords" />
        <meta property="og:description" content="Audit your website's SEO in 60 seconds. AI-powered analysis of 20+ ranking factors with specific recommendations." />
        <meta property="og:url" content="https://jackpotkeywords.web.app/seo-audit" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'JackpotKeywords SEO Audit Tool',
            description: 'AI-powered SEO audit tool that analyzes your website across 20+ ranking factors and provides scored recommendations.',
            url: 'https://jackpotkeywords.web.app/seo-audit',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free audit preview, full report for signed-in users' },
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          })}
        </script>
      </Helmet>

    <div>
      {/* Hero with form */}
      <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 pt-12 pb-16 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: "url('/logo-hero.png')" }}
          role="presentation"
          aria-hidden="true"
        />
        <div className="relative z-10 text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight">
            SEO Audit Your Website
            <br />
            <span className="text-jackpot-400">in 60 Seconds</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            AI-powered analysis of 20+ ranking factors. Title tags, structured data,
            crawlability, content gaps — scored and ranked by impact.
          </p>
        </div>

        <div className="relative z-10 w-full max-w-xl">
          <form onSubmit={handleAudit} className="space-y-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g., markitup.app or https://example.com"
              className="w-full px-5 py-4 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-jackpot-500 focus:ring-1 focus:ring-jackpot-500 outline-none text-lg"
              autoFocus
            />
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-4 rounded-xl text-lg transition"
            >
              Start Free SEO Audit
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-3">
            {user ? 'Full report included with your account.' : 'Sign in to unlock full recommendations.'}
          </p>
        </div>

        {/* Pricing strip */}
        <div className="relative z-10 mt-12 flex items-center gap-6 md:gap-10 text-center text-sm">
          <div>
            <div className="text-2xl font-bold text-jackpot-400">Free</div>
            <div className="text-gray-500">Preview audit<br />No card required</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <div>
            <div className="text-2xl font-bold text-white">$1.99</div>
            <div className="text-gray-500">Per search credit<br />Pay as you go</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <div>
            <div className="text-2xl font-bold text-white">$9.99<span className="text-base font-normal text-gray-400">/mo</span></div>
            <div className="text-gray-500">Unlimited audits<br />+ keyword research</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <Link to="/pricing" className="text-jackpot-400 hover:text-jackpot-300 transition font-medium text-sm">
            See all plans &rarr;
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-12 max-w-lg mx-auto">
            No technical expertise required. Just enter your URL.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-4">{step.icon}</div>
                <div className="text-xs text-jackpot-400 font-bold tracking-widest uppercase mb-2">
                  Step {step.num}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-14 flex items-center justify-center gap-8 md:gap-12 text-center text-sm text-gray-500">
            <div>
              <div className="text-2xl font-bold text-white">20+</div>
              <div>SEO factors<br />checked</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div>
              <div className="text-2xl font-bold text-white">6</div>
              <div>Audit<br />categories</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div>
              <div className="text-2xl font-bold text-white">9</div>
              <div>Pages<br />analyzed</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div>
              <div className="text-2xl font-bold text-jackpot-400">60s</div>
              <div>Report<br />delivered</div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Check */}
      <section className="py-20 px-4 border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">What We Check</h2>
          <p className="text-gray-400 text-center mb-10 max-w-lg mx-auto">
            Every audit covers 6 critical categories. We don&apos;t just find problems — we prioritize them by impact.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="text-xs text-jackpot-400 font-bold mb-2">{f.badge}</div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 px-4 border-t border-gray-800 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover opacity-[0.12] pointer-events-none"
          style={{ backgroundImage: "url('/bg-coins.png')" }}
          role="presentation"
          aria-hidden="true"
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <h2 className="text-3xl font-bold text-center mb-4">Stop Overpaying for SEO Audits</h2>
          <p className="text-gray-400 text-center mb-10">
            AI-powered analysis. Prioritized recommendations. A fraction of the price.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Feature</th>
                  {TOOLS.map((tool) => (
                    <th
                      key={tool}
                      className={`px-3 py-3 text-center font-medium ${
                        tool === 'JackpotKeywords' ? 'text-jackpot-400 bg-jackpot-500/5' : 'text-gray-400'
                      }`}
                    >
                      {tool}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature, fi) => (
                  <tr key={feature} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-gray-300">{feature}</td>
                    {TOOLS.map((tool) => {
                      const val = COMPARISON_DATA[tool][fi];
                      const isUs = tool === 'JackpotKeywords';
                      const isYes = val === 'Yes';
                      const isNo = val === 'No' || val === 'None';
                      return (
                        <td key={tool} className={`px-3 py-3 text-center ${isUs ? 'bg-jackpot-500/5' : ''}`}>
                          <span className={
                            isUs && isYes ? 'text-jackpot-400 font-bold' :
                            isUs ? 'text-jackpot-400 font-bold' :
                            isYes ? 'text-green-400' :
                            isNo ? 'text-gray-600' :
                            'text-gray-400'
                          }>
                            {isYes ? '\u2713' : isNo ? '\u2717' : val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border-b border-gray-800 pb-6">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-link to keyword research */}
      <section className="py-16 px-4 border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Need Keywords Too?</h2>
          <p className="text-gray-400 mb-6">
            Our SEO audit shows you what to fix. Our keyword research tool shows you what to target.
            Describe your product and get 1,000+ scored keywords with real Google Ads data.
          </p>
          <Link
            to="/"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-bold px-8 py-3.5 rounded-xl text-lg transition border border-gray-700"
          >
            Try Keyword Research &rarr;
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 border-t border-gray-800 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover opacity-[0.18] pointer-events-none"
          style={{ backgroundImage: "url('/bg-coins.png')" }}
          role="presentation"
          aria-hidden="true"
        />
        <h2 className="text-3xl font-bold mb-4 relative z-10">
          Find out what&apos;s <span className="text-jackpot-400">holding your site back</span>
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto relative z-10">
          Free audit. No credit card required. Results in under 2 minutes.
        </p>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-xl text-lg transition relative z-10"
        >
          Start Your Free SEO Audit
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4 text-center text-sm text-gray-600">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>&copy; {new Date().getFullYear()} JackpotKeywords. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/pricing" className="hover:text-gray-400 transition">Pricing</Link>
            <Link to="/" className="hover:text-gray-400 transition">Keyword Research</Link>
            <Link to="/blog" className="hover:text-gray-400 transition">Blog</Link>
            <Link to="/features/competitor-keyword-research" className="hover:text-gray-400 transition">Competitor Research</Link>
            <Link to="/help" className="hover:text-gray-400 transition">Help</Link>
            <Link to="/disclaimer" className="hover:text-gray-400 transition">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
