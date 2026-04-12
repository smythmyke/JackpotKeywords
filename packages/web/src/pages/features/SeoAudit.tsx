import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const FEATURES = [
  {
    title: 'Technical Foundation',
    desc: 'Check your title tags, meta descriptions, heading hierarchy, HTTPS, viewport, and canonical URLs. We verify the fundamentals that search engines need to understand your pages.',
  },
  {
    title: 'Content Structure',
    desc: 'Analyze your content depth, blog presence, about page, and internal linking. Thin content and missing pages hurt your topical authority — we flag the gaps.',
  },
  {
    title: 'Structured Data',
    desc: 'Detect JSON-LD types on your site and identify missing schema opportunities. FAQ, Product, Article, and Organization schema can unlock rich results in Google.',
  },
  {
    title: 'Crawlability & Bot Access',
    desc: 'Verify your robots.txt, sitemap.xml, noindex tags, and JavaScript rendering. If search engines can\'t read your content, nothing else matters.',
  },
  {
    title: 'Local & Geo SEO',
    desc: 'Check for LocalBusiness schema, NAP consistency, and location signals. Critical for businesses that serve customers in specific areas.',
  },
  {
    title: 'Social & Sharing',
    desc: 'Audit your Open Graph and Twitter Card tags. When your content gets shared, it should look compelling — not broken.',
  },
];

const STEPS = [
  'Enter your website URL. We analyze the page you provide plus up to 8 additional pages discovered through your sitemap or internal links.',
  'AI reads each page, checks 20+ SEO factors, and scores your site across 6 categories. Your sitemap, robots.txt, and structured data are all verified.',
  'Get a scored report with specific recommendations sorted by impact. See exactly what to fix, what\'s missing, and which keywords your site should target.',
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
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            SEO Audit Your Website in 60 Seconds
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Enter your URL and get an AI-powered SEO analysis covering 20+ ranking factors.
            Title tags, structured data, crawlability, content gaps — scored and ranked by impact.
            No account required to start.
          </p>
          <Link
            to="/seo-audit"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Audit My Website
          </Link>
        </section>

        {/* Problem */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Why Your Website Needs an SEO Audit</h2>
          <div className="space-y-4 text-gray-400 leading-relaxed">
            <p>
              Most websites have SEO issues they don&apos;t know about. Missing meta descriptions,
              broken structured data, JavaScript rendering problems, thin content — each one costs
              you rankings and traffic.
            </p>
            <p>
              Traditional SEO audit tools like Ahrefs Site Audit ($99/mo), SEMrush ($140/mo), or
              Screaming Frog ($259/year) are built for agencies managing hundreds of sites.
              JackpotKeywords gives you the same analysis for a fraction of the cost —
              or free for your first audit.
            </p>
            <p>
              We don&apos;t just list problems. We score every factor, prioritize by impact,
              and tell you exactly what to do next.
            </p>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">What We Check</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">How the SEO Audit Works</h2>
          <div className="space-y-6">
            {STEPS.map((text, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex gap-4">
                <div className="text-jackpot-400 font-bold text-2xl shrink-0">{i + 1}</div>
                <p className="text-gray-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center py-12 border-t border-gray-800">
          <h2 className="text-3xl font-bold text-white mb-4">Find out what&apos;s holding your site back</h2>
          <p className="text-gray-400 mb-8">Free audit. No credit card required. Results in under 2 minutes.</p>
          <Link
            to="/seo-audit"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Start Your Free Audit
          </Link>
          <div className="mt-6 flex justify-center gap-6 text-sm">
            <Link to="/pricing" className="text-jackpot-400 hover:underline">See pricing</Link>
            <Link to="/" className="text-jackpot-400 hover:underline">
              Need keywords instead? Try Keyword Research
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
