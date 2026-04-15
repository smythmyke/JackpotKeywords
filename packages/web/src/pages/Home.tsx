import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
    a: 'Real advertiser-grade data — actual search volumes, CPC ranges, and competition levels. We combine multiple data sources with AI analysis for the most complete picture.',
  },
  {
    q: 'How is this different from ChatGPT keyword suggestions?',
    a: "ChatGPT can brainstorm keywords but has no real data behind them. We give you actual monthly search volume, CPC ranges, competition levels, and opportunity scores — all from Google's live data.",
  },
  {
    q: 'What is a Jackpot Score?',
    a: 'Our proprietary score (0-100) that combines volume, CPC, competition, and trend direction to find keywords that are high-traffic, low-cost, and rising. Green = goldmine.',
  },
  {
    q: 'Do my results expire?',
    a: 'Never. Your saved searches are permanent. Come back anytime to review, export, or act on your keywords.',
  },
  {
    q: 'Can I use this for SEO and paid ads?',
    a: 'Yes. Toggle between Ad Score and SEO Score views. Ad Score optimizes for low CPC + high volume. SEO Score optimizes for rankability + search intent.',
  },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const prefillQuery = (location.state as any)?.prefillQuery || '';
  const { user, profile, credits, signInWithGoogle, getToken } = useAuthContext();

  const ADMIN_EMAILS = ['smythmyke@gmail.com'];
  const isAdmin = profile?.email && ADMIN_EMAILS.includes(profile.email);
  const plan = profile?.plan || 'free';

  function getStatusLine(): string {
    if (!user) return '3 free searches. No sign-up required.';
    if (isAdmin) return 'Unlimited searches. Admin access.';
    if (plan === 'pro') return 'Unlimited searches. Pro plan.';
    if (plan === 'agency') return 'Unlimited searches. Agency plan.';
    if (credits && credits.balance > 0) return `You have ${credits.balance} credit${credits.balance !== 1 ? 's' : ''} remaining.`;
    if (credits && credits.freeSearchesUsed < 3) return `${3 - credits.freeSearchesUsed} of 3 free searches remaining.`;
    return "You've used your free searches. Unlock more from $1.99.";
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
        <link rel="canonical" href="https://jackpotkeywords.web.app/" />
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

        <SearchForm onSearch={handleSearch} loading={loading} initialDescription={prefillQuery} />

        {/* Pricing strip */}
        <div className="mt-12 flex items-center gap-6 md:gap-10 text-center text-sm">
          <div>
            <div className="text-2xl font-bold text-jackpot-400">Free</div>
            <div className="text-gray-500">3 searches<br />No card required</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <div>
            <div className="text-2xl font-bold text-white">$1.99</div>
            <div className="text-gray-500">Per search<br />Pay as you go</div>
          </div>
          <div className="w-px h-10 bg-gray-800" />
          <div>
            <div className="text-2xl font-bold text-white">$9.99<span className="text-base font-normal text-gray-400">/mo</span></div>
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

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4 text-center text-sm text-gray-600">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>&copy; {new Date().getFullYear()} JackpotKeywords. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/pricing" className="hover:text-gray-400 transition">Pricing</Link>
            <Link to="/blog" className="hover:text-gray-400 transition">Blog</Link>
            <Link to="/seo-audit" className="hover:text-gray-400 transition">SEO Audit</Link>
            <Link to="/features/competitor-keyword-research" className="hover:text-gray-400 transition">Competitor Research</Link>
            <Link to="/features/long-tail-keyword-generator" className="hover:text-gray-400 transition">Long-Tail Generator</Link>
            <Link to="/features/keyword-competition-checker" className="hover:text-gray-400 transition">Competition Checker</Link>
            <Link to="/help" className="hover:text-gray-400 transition">Help</Link>
            <Link to="/disclaimer" className="hover:text-gray-400 transition">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
