import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const FEATURES = [
  {
    title: 'AI-Powered Generation',
    desc: 'Our AI generates 50-70+ seed keywords per search, with at least one long tail variant (4+ words) in every category. These are not generic suggestions — they are tailored to your specific product and audience.',
  },
  {
    title: 'Google Autocomplete Expansion',
    desc: 'We query Google Autocomplete to discover the long tail phrases that real people actually type. These are search patterns you cannot find by brainstorming alone.',
  },
  {
    title: '12 Intent Categories',
    desc: 'Long tail keywords span every intent: feature-based, problem-based, use-case, audience-specific, and more. Each category surfaces a different angle on how people search for products like yours.',
  },
  {
    title: 'Verified With Real Data',
    desc: 'Every long tail keyword is enriched with actual monthly search volume, CPC range, competition level, and 12-month trend data from the Google Ads API. You know exactly which phrases are worth targeting.',
  },
];

const STEPS = [
  'Describe your product or service. Include details about your audience, features, and use cases — the more specific you are, the better the long tail results.',
  'JackpotKeywords combines AI seed generation, Google Autocomplete discovery, and Keyword Planner expansion to build a comprehensive list of long tail keyword opportunities.',
  'Filter and sort by volume, CPC, competition, or Jackpot Score. Export your best long tail keywords to CSV or Google Ads Editor format.',
];

export default function LongTailKeywordGenerator() {
  return (
    <>
      <Helmet>
        <title>Long Tail Keyword Generator — JackpotKeywords</title>
        <meta name="description" content="Generate long tail keywords with real search volume and CPC data. Our free long tail keyword tool finds 4+ word phrases across 12 intent categories." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/features/long-tail-keyword-generator" />
        <meta property="og:title" content="Long Tail Keyword Generator — JackpotKeywords" />
        <meta property="og:description" content="Generate long tail keywords with real search volume and CPC data. Find 4+ word phrases across 12 intent categories." />
        <meta property="og:url" content="https://jackpotkeywords.web.app/features/long-tail-keyword-generator" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'JackpotKeywords Long Tail Keyword Generator',
            description: 'Free long tail keyword tool that generates 4+ word keyword phrases with real Google Ads search volume, CPC, and competition data.',
            url: 'https://jackpotkeywords.web.app/features/long-tail-keyword-generator',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: '3 free searches, no credit card required',
            },
          })}
        </script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Long Tail Keyword Generator With Real Data
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Long tail keywords convert better, cost less, and are easier to rank for. JackpotKeywords
            generates hundreds of long tail keyword phrases from a plain-English product description — each
            enriched with actual Google Ads search volume, CPC, and competition data. No guesswork. No seed
            keywords needed.
          </p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Generate Keywords Free
          </Link>
        </section>

        {/* Problem */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Why Long Tail Keywords Win</h2>
          <div className="space-y-4 text-gray-400 leading-relaxed">
            <p>
              Head terms like &ldquo;running shoes&rdquo; get massive volume, but the competition is brutal
              and the intent is vague. A searcher might be browsing, researching, or looking for images.
              Long tail keywords like &ldquo;best running shoes for flat feet women&rdquo; signal a buyer
              who knows exactly what they need.
            </p>
            <p>
              Long tail keywords make up over 70% of all searches. They have lower CPC in paid campaigns,
              higher conversion rates, and less competition in organic results. For small businesses and
              startups, they are the fastest path to real traffic.
            </p>
            <p>
              The challenge has always been finding them. Most free long tail keyword tools give you phrases
              with no data behind them — no volume, no CPC, no indication of whether anyone actually searches
              for them. JackpotKeywords solves this by pairing AI generation with real Google Ads data.
            </p>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">How JackpotKeywords Generates Long Tail Keywords</h2>
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
          <h2 className="text-3xl font-bold text-white mb-8">Generate Long Tail Keywords in 3 Steps</h2>
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
          <h2 className="text-3xl font-bold text-white mb-4">Discover long tail keywords that convert</h2>
          <p className="text-gray-400 mb-8">3 free searches. No credit card required. Results in under 30 seconds.</p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Start Your Free Search
          </Link>
          <div className="mt-6 flex justify-center gap-6 text-sm">
            <Link to="/pricing" className="text-jackpot-400 hover:underline">See pricing</Link>
            <Link to="/blog/find-good-seo-keywords" className="text-jackpot-400 hover:underline">
              Read: How to Find Good SEO Keywords
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
