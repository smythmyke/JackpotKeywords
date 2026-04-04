import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const FEATURES = [
  {
    title: 'AI Competitor Detection',
    desc: 'Describe your product and our AI identifies competitors mentioned in your market context. No domain lookups needed — we find the brands your customers are comparing you against.',
  },
  {
    title: 'Competitor Brand Keywords',
    desc: 'Discover keywords where people search for your competitors by name. These high-intent searches reveal exactly who your audience considers when buying.',
  },
  {
    title: 'Alternative & Comparison Queries',
    desc: 'Surface searches like "X alternative", "X vs Y", "cheaper than X", and "X pricing". These are buyers actively evaluating options — and you can intercept them.',
  },
  {
    title: 'Real Google Ads Data',
    desc: 'Every competitor keyword comes with actual monthly search volume, CPC range, and competition level from the Google Ads API. Not estimates — real advertiser data.',
  },
];

const STEPS = [
  'Describe your product or service in plain English. Include what you sell and who you sell to.',
  'Our AI analyzes your description, identifies competitors, and generates keyword seeds across competitor brand and competitor alternative categories. Google Autocomplete expands the results.',
  'Review your competitor keywords with volume, CPC, competition, and Jackpot Scores. Export the best opportunities or send them directly to Google Ads.',
];

export default function CompetitorKeywordResearch() {
  return (
    <>
      <Helmet>
        <title>Competitor Keyword Research Tool — JackpotKeywords</title>
        <meta name="description" content="Discover your competitors' keywords with AI-powered competitor keyword research. Find competitor brand terms, alternative searches, and gaps — free to try." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/features/competitor-keyword-research" />
        <meta property="og:title" content="Competitor Keyword Research Tool — JackpotKeywords" />
        <meta property="og:description" content="Discover your competitors' keywords with AI-powered competitor keyword research. Find competitor brand terms, alternative searches, and gaps." />
        <meta property="og:url" content="https://jackpotkeywords.web.app/features/competitor-keyword-research" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'JackpotKeywords Competitor Keyword Research',
            description: 'AI-powered competitor keyword research tool that discovers competitor brand keywords, alternative searches, and competitive gaps using Google Ads data.',
            url: 'https://jackpotkeywords.web.app/features/competitor-keyword-research',
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
            Competitor Keyword Research Made Simple
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Stop guessing what keywords your competitors target. JackpotKeywords uses AI to identify
            competitor brand terms, &ldquo;alternative to&rdquo; searches, and comparison keywords — all
            enriched with real Google Ads volume and CPC data. Describe your product and discover what
            your market is already searching for.
          </p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Try It Free
          </Link>
        </section>

        {/* Problem */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Why Competitor Keyword Research Matters</h2>
          <div className="space-y-4 text-gray-400 leading-relaxed">
            <p>
              Your competitors are already ranking for keywords that your customers search. Some of those
              keywords have low competition and high intent — they are opportunities you are missing right now.
            </p>
            <p>
              Traditional competitor keyword research tools cost $99–$140 per month and require you to know
              your competitors&apos; domains. JackpotKeywords takes a different approach: describe your product
              in plain English, and AI automatically identifies your competitors and generates keyword
              opportunities around them.
            </p>
            <p>
              Instead of reverse-engineering one domain at a time, you get a complete competitor keyword
              landscape in a single search.
            </p>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">How JackpotKeywords Finds Competitor Keywords</h2>
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
          <h2 className="text-3xl font-bold text-white mb-8">Competitor Keyword Research in 3 Steps</h2>
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
          <h2 className="text-3xl font-bold text-white mb-4">Find the keywords your competitors own</h2>
          <p className="text-gray-400 mb-8">3 free searches. No credit card required. Results in under 30 seconds.</p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Start Your Free Search
          </Link>
          <div className="mt-6 flex justify-center gap-6 text-sm">
            <Link to="/pricing" className="text-jackpot-400 hover:underline">See pricing</Link>
            <Link to="/blog/find-competitor-keywords" className="text-jackpot-400 hover:underline">
              Read: How to Find Competitor Keywords
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
