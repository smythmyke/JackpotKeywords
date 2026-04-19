import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuthContext } from '../contexts/AuthContext';
import { runSearch } from '../services/api';
import { trackSearch } from '../services/analytics';
import { trackEvent } from '../lib/analytics';
import SearchForm from '../components/SearchForm';
import SearchProgress from '../components/SearchProgress';

const COMPARISON_FEATURES = [
  'Price',
  'Real search volume data',
  'CPC & competition data',
  'Trend analysis',
  'AI opportunity scoring',
  '12 intent categories',
  'No keyword expertise needed',
];

const COMPARISON_DATA: Record<string, string[]> = {
  'JackpotKeywords': ['$9.99/mo', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes'],
  'SEMrush':         ['$140/mo', 'Estimated', 'Yes', 'Separate', 'Basic', 'Manual', 'No'],
  'Ahrefs':          ['$99/mo', 'Estimated', 'Yes', 'Partial', 'No', 'Manual', 'No'],
  'SE Ranking':      ['$44/mo', 'Estimated', 'Yes', 'Partial', 'Basic', 'Manual', 'No'],
  'Ubersuggest':     ['$29/mo', 'Limited', 'Partial', 'No', 'No', 'No', 'No'],
  'KeywordTool.io':  ['$89/mo', 'No', 'No', 'No', 'No', 'No', 'No'],
};

const TOOLS = Object.keys(COMPARISON_DATA);

const STEPS = [
  {
    num: '1',
    title: 'Describe Your Product',
    desc: 'Tell us what you sell in plain English. No keyword knowledge needed.',
    icon: '✏️',
  },
  {
    num: '2',
    title: 'AI Finds Opportunities',
    desc: '4 data sources. 12 intent categories. 1,000+ keywords analyzed in seconds.',
    icon: '🔍',
  },
  {
    num: '3',
    title: 'Get Your Goldmine',
    desc: 'Ranked keywords with real volume, CPC, and Jackpot Scores. Export and act.',
    icon: '💰',
  },
];

const CATEGORIES = [
  'Direct Intent',
  'Feature-Based',
  'Problem-Based',
  'Audience',
  'Competitor Brands',
  'Competitor Alternatives',
  'Use Case',
  'Industry / Niche',
  'Benefit / Outcome',
  'Adjacent',
  'Seasonal',
  'Local',
];

const FAQS = [
  {
    q: 'Where does the keyword data come from?',
    a: 'Real advertiser-grade data from the Google Ads API — the same source as Google Keyword Planner. Every keyword includes actual monthly search volume, CPC bid ranges, competition levels, and 12-month trend data. We combine this with Google Autocomplete, Google Trends, and Gemini AI analysis for discovery, scoring, and intent classification.',
  },
  {
    q: 'How is this different from ChatGPT keyword suggestions?',
    a: "ChatGPT can brainstorm keywords but has no real data behind them — no search volume, no CPC, no competition levels. JackpotKeywords gives you actual monthly search volume, CPC ranges, competition data, and opportunity scores from Google's live advertising data. Every keyword is backed by numbers, not guesses.",
  },
  {
    q: 'What is a Jackpot Score?',
    a: 'Our proprietary score (0-100) that combines search volume, CPC, competition level, and trend direction into a single metric. High scores identify keywords that are high-traffic, low-cost, and rising in demand — the goldmine opportunities hiding in your market.',
  },
  {
    q: 'Do my results expire?',
    a: 'Never. Your saved searches are permanent. Come back anytime to review, filter, export to CSV or Excel, or act on your keywords. Pro subscribers can save up to 200 individual keywords per search for quick access.',
  },
  {
    q: 'Can I use this for SEO and paid ads?',
    a: 'Yes. Toggle between Ad Score and SEO Score views in your results. Ad Score optimizes for low CPC and high volume — ideal for Google Ads campaign planning. SEO Score optimizes for rankability and search intent — ideal for content strategy and organic traffic.',
  },
  {
    q: 'How does JackpotKeywords compare to SEMrush or Ahrefs?',
    a: 'JackpotKeywords focuses on keyword discovery with real Google Ads data for $9.99/month. SEMrush ($140/month) and Ahrefs ($99/month) are full SEO suites that include backlink analysis, rank tracking, and site audits alongside keyword research. If your primary need is finding the right keywords, JackpotKeywords provides more accurate keyword data at 1/14th the price.',
  },
  {
    q: 'What is an SEO audit and do you offer one?',
    a: 'An SEO audit checks your website for technical issues that affect search rankings — title tags, structured data, crawlability, content depth, and more. JackpotKeywords includes a free SEO audit tool that checks 20+ ranking factors and provides AI-powered fix recommendations in about 60 seconds.',
  },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefillQuery = (location.state as any)?.prefillQuery || searchParams.get('q') || '';
  const prefillUrl = searchParams.get('url') || '';
  const { user, profile, credits, signInWithGoogle, getToken } = useAuthContext();

  const ADMIN_EMAILS = ['smythmyke@gmail.com'];
  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);
  const plan = profile?.plan || 'free';

  function getStatusLine(): string {
    if (!user) return '3 free runs (search or audit). No sign-up required.';
    if (isAdmin) return 'Unlimited runs. Admin access.';
    if (plan === 'pro') return 'Unlimited searches and audits. Pro plan.';
    if (plan === 'agency') return 'Unlimited searches and audits. Agency plan.';
    if (credits && credits.balance > 0) return `You have ${credits.balance} credit${credits.balance !== 1 ? 's' : ''} remaining.`;
    if (credits && credits.freeSearchesUsed < 3) return `${3 - credits.freeSearchesUsed} of 3 free runs remaining.`;
    return "You've used your free runs. Unlock more from $1.99.";
  }

  const handleSearch = async (description: string, url: string, maxCpc?: number, location?: string) => {
    setError(null);
    setLoading(true);
    try {
      const token = user ? await getToken() : null;

      trackSearch(description);
      const result = await runSearch(token, {
        description,
        url: url || undefined,
        location,
      });

      if (!user) {
        trackEvent('anon_search_completed', {
          keywordCount: result.keywords?.length || 0,
          productLabel: result.productLabel || null,
        });
      }

      // Results not saved to Firestore — pass via state for both auth and anonymous
      navigate('/results/anonymous', { state: { result, maxCpc } });
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('free search limit')) {
        trackEvent('paywall_viewed', { source: 'anon_searches_exhausted' });
      }
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <SearchProgress />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>JackpotKeywords — AI Keyword Research Tool</title>
        <meta
          name="description"
          content="Describe your product. Find your goldmine keywords. AI-powered keyword research with real Google data at 1/14th the price of SEMrush."
        />
        <link rel="canonical" href="https://jackpotkeywords.web.app/" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'JackpotKeywords',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'AI-powered keyword research tool with real Google Ads data. Discover 1,000+ keyword opportunities across 12 intent categories — scored, ranked, and ready to act on.',
            url: 'https://jackpotkeywords.web.app',
            offers: [
              { '@type': 'Offer', price: '1.99', priceCurrency: 'USD', description: 'Single search' },
              { '@type': 'Offer', price: '9.99', priceCurrency: 'USD', description: 'Pro — unlimited searches' },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          })}
        </script>
      </Helmet>
    <div>
      {/* Hero */}
      <section className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 pt-6 pb-12 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-contain opacity-[0.18] pointer-events-none"
          style={{ backgroundImage: "url('/logo-hero.png')" }}
          role="presentation"
          aria-hidden="true"
        />
        <div className="relative z-10 text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight">
            Describe your product.
            <br />
            <span className="text-jackpot-400">Find your goldmine.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            AI-powered keyword research with real Google Ads data.
            1,000+ keywords across 12 intent categories — scored and ranked.
            <br />
            <span className="text-white font-medium">{getStatusLine()}</span>
          </p>
        </div>

        <div className="relative z-10 w-full flex flex-col items-center">
        {error && (
          <div className="w-full max-w-2xl mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <SearchForm onSearch={handleSearch} loading={loading} initialDescription={prefillQuery} initialUrl={prefillUrl} />

        {/* Pricing strip */}
        <div className="mt-12 flex items-center gap-6 md:gap-10 text-center text-sm">
          <div>
            <div className="text-2xl font-bold text-white">$1.99</div>
            <div className="text-gray-500">Per search<br />Pay as you go</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <div>
            <div className="text-2xl font-bold text-jackpot-400">$9.99<span className="text-base font-normal text-gray-400">/mo</span></div>
            <div className="text-gray-500">Unlimited searches<br />Best value</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <Link to="/pricing" className="text-jackpot-400 hover:text-jackpot-300 transition font-medium text-sm">
            See all plans &rarr;
          </Link>
        </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-12 max-w-lg mx-auto">
            No keyword expertise required. Just describe what you sell.
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
              <div className="text-2xl font-bold text-white">4</div>
              <div>Data sources<br />combined</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div>
              <div className="text-2xl font-bold text-white">12</div>
              <div>Intent<br />categories</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div>
              <div className="text-2xl font-bold text-white">14x</div>
              <div>Cheaper than<br />SEMrush</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div>
              <div className="text-2xl font-bold text-jackpot-400">30s</div>
              <div>Results<br />delivered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Screenshot */}
      <section className="py-16 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-3">See What You Get</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Market Intelligence dashboard, 12 category tabs, keyword scoring, budget calculator — all from one search.
          </p>
          <div className="rounded-xl border border-gray-800 overflow-hidden shadow-2xl shadow-black/50">
            <img
              src="/screenshot-dashboard.png"
              alt="JackpotKeywords results dashboard showing Market Intelligence score, 1,000 keywords found, 12 intent category tabs, and budget calculator"
              className="w-full"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 10 Categories */}
      <section className="py-20 px-4 border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">12 Intent Categories</h2>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">
            We don&apos;t just find keywords — we organize them by how people search.
            Every search covers up to 12 categories.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-full text-sm"
              >
                {cat}
              </span>
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
          <h2 className="text-3xl font-bold text-center mb-4">Stop Overpaying for Keywords</h2>
          <p className="text-gray-400 text-center mb-10">
            Real data. AI scoring. A fraction of the price.
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
                        <td
                          key={tool}
                          className={`px-3 py-3 text-center ${isUs ? 'bg-jackpot-500/5' : ''}`}
                        >
                          <span className={
                            isUs && isYes ? 'text-jackpot-400 font-bold' :
                            isUs ? 'text-jackpot-400 font-bold' :
                            isYes ? 'text-score-green' :
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

      {/* SEO Audit Cross-link */}
      <section className="py-16 px-4 border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Already Have a Website?</h2>
          <p className="text-gray-400 mb-6">
            Audit your site&apos;s SEO in 60 seconds. Check title tags, structured data, crawlability,
            and 20+ ranking factors — with AI-powered recommendations to fix what&apos;s broken.
          </p>
          <Link
            to="/seo-audit"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-bold px-8 py-3.5 rounded-xl text-lg transition border border-gray-700"
          >
            Try Free SEO Audit &rarr;
          </Link>
        </div>
      </section>

      {/* What Is JackpotKeywords — Expanded Content for SEO */}
      <section className="py-20 px-4 border-t border-gray-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">What Is JackpotKeywords?</h2>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              JackpotKeywords is an AI-powered keyword research tool that finds the search terms your customers
              actually use — without requiring you to know any seed keywords. Describe your product or service
              in plain English, and our AI analyzes your market, identifies competitors, and generates keyword
              opportunities across 12 intent categories: direct, feature-based, problem-based, audience,
              competitor brands, alternatives, use case, industry, benefit, adjacent, seasonal, and local.
            </p>
            <p>
              Every keyword is enriched with data from the Google Ads API — the same source that powers
              Google Keyword Planner. You get exact monthly search volumes (not ranges), actual CPC bid data,
              competition levels, and 12-month trend direction. Our Jackpot Score combines these metrics into
              a single 0-100 rating that surfaces the best opportunities first.
            </p>
            <p>
              Traditional keyword tools like SEMrush ($140/month) and Ahrefs ($99/month) require you to
              already know what keywords to search for. JackpotKeywords eliminates this cold-start problem
              entirely — you describe what you sell, and the AI discovers keywords you would never think to
              search for manually. At $9.99/month for unlimited searches, it costs a fraction of enterprise
              SEO platforms while providing more accurate keyword data from Google&apos;s own systems.
            </p>
          </div>

          <h3 className="text-xl font-bold mt-10 mb-4">Who Is JackpotKeywords For?</h3>
          <div className="space-y-4 text-gray-300 leading-relaxed">
            <p>
              JackpotKeywords is built for small business owners, indie founders, content creators, and
              marketing teams who need real keyword data without enterprise pricing or SEO expertise.
              Whether you are launching a new SaaS product, optimizing an{' '}
              <Link to="/blog/ecommerce-keyword-research" className="text-jackpot-400 hover:underline">
                e-commerce store
              </Link>
              , planning{' '}
              <Link to="/blog/ppc-keyword-research" className="text-jackpot-400 hover:underline">
                Google Ads campaigns
              </Link>
              , or building a content strategy around{' '}
              <Link to="/blog/how-to-find-low-competition-keywords" className="text-jackpot-400 hover:underline">
                low-competition keywords
              </Link>
              , the tool adapts to your use case.
            </p>
            <p>
              New to keyword research? Our{' '}
              <Link to="/blog/what-is-keyword-research" className="text-jackpot-400 hover:underline">
                beginner&apos;s guide
              </Link>{' '}
              explains the fundamentals — search volume, CPC, competition, and intent — in plain language.
              Already familiar with keyword tools? See how we compare in our{' '}
              <Link to="/blog/best-keyword-research-tool-2026" className="text-jackpot-400 hover:underline">
                2026 tool comparison
              </Link>{' '}
              or read our{' '}
              <Link to="/blog/seo-keyword-analysis-tools" className="text-jackpot-400 hover:underline">
                SEO keyword analysis tools guide
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-20 px-4 border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Real Data, Not Guesswork</h2>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">
            Every keyword is enriched with real data — not estimates, not scraped guesses.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Search Volume', desc: 'Real monthly search data, not estimates', badge: 'Exact' },
              { name: 'CPC & Competition', desc: 'Actual advertiser bid ranges and competition', badge: 'Live' },
              { name: 'Trend Analysis', desc: '12-month trends and seasonality detection', badge: 'Historical' },
              { name: 'AI Scoring', desc: 'Intent mapping, scoring & categorization', badge: 'Intelligent' },
            ].map((source) => (
              <div key={source.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs text-jackpot-400 font-bold mb-2">{source.badge}</div>
                <h3 className="font-bold mb-1">{source.name}</h3>
                <p className="text-gray-400 text-sm">{source.desc}</p>
              </div>
            ))}
          </div>

          {/* Keyword table screenshot */}
          <div className="mt-10 rounded-xl border border-gray-800 overflow-hidden shadow-2xl shadow-black/50">
            <img
              src="/screenshot-keywords.png"
              alt="JackpotKeywords keyword table showing keywords with source, intent labels, search volume, CPC range, competition level, trend direction, and Ad Score columns"
              className="w-full"
              loading="lazy"
            />
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

      {/* Final CTA */}
      <section className="py-20 px-4 border-t border-gray-800 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover opacity-[0.18] pointer-events-none"
          style={{ backgroundImage: "url('/bg-coins.png')" }}
          role="presentation"
          aria-hidden="true"
        />
        <h2 className="text-3xl font-bold mb-4 relative z-10">
          Ready to find your <span className="text-jackpot-400">goldmine keywords</span>?
        </h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto relative z-10">
          3 free searches. No credit card required. Results in under 30 seconds.
        </p>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-xl text-lg transition relative z-10"
        >
          Start Your Free Search
        </a>
      </section>

      {/* Footer is rendered globally by Layout */}
    </div>
    </>
  );
}
