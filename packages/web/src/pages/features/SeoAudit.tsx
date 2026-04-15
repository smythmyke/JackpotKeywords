import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const FEATURES = [
  {
    title: 'Technical Foundation',
    desc: 'Check your title tags, meta descriptions, heading hierarchy, HTTPS, viewport, and canonical URLs. We verify the fundamentals that search engines need to understand your pages.',
    badge: 'Core',
  },
  {
    title: 'Content Structure',
    desc: 'Analyze your content depth, blog presence, about page, and internal linking. Thin content and missing pages hurt your topical authority — we flag the gaps.',
    badge: 'Content',
  },
  {
    title: 'Structured Data',
    desc: 'Detect JSON-LD types on your site and identify missing schema opportunities. FAQ, Product, Article, and Organization schema can unlock rich results in Google.',
    badge: 'Rich Results',
  },
  {
    title: 'Crawlability & Bot Access',
    desc: 'Verify your robots.txt, sitemap.xml, noindex tags, and JavaScript rendering. If search engines can\'t read your content, nothing else matters.',
    badge: 'Critical',
  },
  {
    title: 'Local & Geo SEO',
    desc: 'Check for LocalBusiness schema, NAP consistency, and location signals. Critical for businesses that serve customers in specific areas.',
    badge: 'Local',
  },
  {
    title: 'Social & Sharing',
    desc: 'Audit your Open Graph and Twitter Card tags. When your content gets shared, it should look compelling — not broken.',
    badge: 'Social',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Enter Your URL',
    desc: 'Type your website address. We analyze the page you provide plus up to 8 additional pages discovered through your sitemap or internal links.',
    icon: '\uD83C\uDF10',
  },
  {
    num: '2',
    title: 'AI Analyzes Everything',
    desc: 'AI reads each page, checks 20+ SEO factors, and scores your site across 6 categories. Your sitemap, robots.txt, and structured data are all verified.',
    icon: '\uD83E\uDD16',
  },
  {
    num: '3',
    title: 'Get Your Report',
    desc: 'Scored checklist with specific recommendations sorted by impact. See exactly what to fix, what\'s missing, and which keywords your site should target.',
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
    a: 'We deep-analyze the URL you provide, then discover and scan up to 8 additional pages from your sitemap or internal links. This gives us a site-wide picture without the cost of crawling hundreds of pages.',
  },
  {
    q: 'How is this different from Google Search Console?',
    a: 'Google Search Console shows you what Google already knows about your site. Our audit proactively checks what\'s wrong and tells you exactly how to fix it — with prioritized recommendations and keyword gap opportunities.',
  },
  {
    q: 'Do I need technical knowledge to use this?',
    a: 'No. We score every factor with pass/warning/fail indicators and provide plain-English recommendations. You\'ll know exactly what to do, even if you\'ve never touched SEO before.',
  },
  {
    q: 'Can I audit any website?',
    a: 'Yes — you can audit your own site or any publicly accessible website. Some sites behind authentication or Cloudflare challenges may return partial results.',
  },
  {
    q: 'What\'s included in the free audit vs the full report?',
    a: 'The free audit shows all check statuses (pass/warning/fail) so you know what needs attention. The full report ($1.99 or included with Pro) unlocks specific fix recommendations and keyword gap opportunities.',
  },
];

export default function SeoAudit() {
  return (
    <>
      <Helmet>
        <title>Free SEO Audit Tool — JackpotKeywords</title>
        <meta name="description" content="Audit your website's SEO in 60 seconds. Check title tags, meta descriptions, structured data, crawlability, and more. AI-powered analysis with specific fix recommendations." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/features/seo-audit" />
        <meta property="og:title" content="Free SEO Audit Tool — JackpotKeywords" />
        <meta property="og:description" content="Audit your website's SEO in 60 seconds. AI-powered analysis of 20+ ranking factors with specific recommendations." />
        <meta property="og:url" content="https://jackpotkeywords.web.app/features/seo-audit" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'JackpotKeywords SEO Audit Tool',
            description: 'AI-powered SEO audit tool that analyzes your website across 20+ ranking factors and provides scored recommendations.',
            url: 'https://jackpotkeywords.web.app/features/seo-audit',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'Free audit with limited recommendations, full report from $1.99',
            },
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
      {/* Hero */}
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

        <div className="relative z-10 flex flex-col items-center">
          <Link
            to="/seo-audit"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-10 py-4 rounded-xl text-lg transition"
          >
            Audit My Website — Free
          </Link>

          {/* Pricing strip */}
          <div className="mt-12 flex items-center gap-6 md:gap-10 text-center text-sm">
            <div>
              <div className="text-2xl font-bold text-jackpot-400">Free</div>
              <div className="text-gray-500">Preview audit<br />No card required</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div>
              <div className="text-2xl font-bold text-white">$1.99</div>
              <div className="text-gray-500">Full report<br />All recommendations</div>
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
                        <td
                          key={tool}
                          className={`px-3 py-3 text-center ${isUs ? 'bg-jackpot-500/5' : ''}`}
                        >
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

      {/* Why audit matters */}
      <section className="py-20 px-4 border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Why Your Website Needs an SEO Audit</h2>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">
            Most websites have SEO issues they don&apos;t know about. Each one costs rankings and traffic.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Missing Meta Tags', desc: 'Pages without title tags or descriptions are invisible to search engines', badge: 'Common' },
              { name: 'Broken Structured Data', desc: 'Invalid JSON-LD means no rich results in Google — no stars, no FAQs, no prices', badge: 'Hidden' },
              { name: 'Crawl Blockers', desc: 'JavaScript-only pages, noindex tags, and robots.txt issues silently kill indexing', badge: 'Silent' },
              { name: 'Content Gaps', desc: 'Topics your audience searches for that your site doesn\'t cover — free traffic left on the table', badge: 'Opportunity' },
            ].map((item) => (
              <div key={item.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs text-jackpot-400 font-bold mb-2">{item.badge}</div>
                <h3 className="font-bold mb-1">{item.name}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
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
        <Link
          to="/seo-audit"
          className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-xl text-lg transition relative z-10"
        >
          Start Your Free SEO Audit
        </Link>
      </section>

      {/* Footer is rendered globally by Layout */}
    </div>
    </>
  );
}
