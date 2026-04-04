import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const FEATURES = [
  {
    title: 'Google Ads Competition Ratings',
    desc: 'Every keyword is rated LOW, MEDIUM, or HIGH competition based on real advertiser density from the Google Ads API. This is not an estimated difficulty score — it reflects actual competitive pressure.',
  },
  {
    title: 'CPC Range Analysis',
    desc: 'See the low and high bid estimates for each keyword in USD. Competition drives CPC: high-competition keywords cost more per click, while low-competition gems deliver affordable traffic.',
  },
  {
    title: 'Competition-Weighted Scoring',
    desc: 'Competition factors into both the Ad Score (20% weight) and SEO Score (25% weight). Keywords with low competition and strong volume get higher Jackpot Scores — surfacing the best opportunities automatically.',
  },
  {
    title: 'Filter by Competition Level',
    desc: 'Sort and filter your entire keyword list by competition level. Instantly isolate the LOW competition keywords that match your budget and strategy.',
  },
];

const STEPS = [
  'Describe your product or service. JackpotKeywords generates 1,000+ keyword opportunities across 12 intent categories.',
  'Every keyword is enriched with competition data from the Google Ads API: competition level (LOW/MEDIUM/HIGH), CPC range, search volume, and 12-month trends.',
  'Filter by competition level, sort by Jackpot Score, and focus on keywords where competition is low and opportunity is high. Export your selections to CSV or Google Ads Editor.',
];

export default function KeywordCompetitionChecker() {
  return (
    <>
      <Helmet>
        <title>Keyword Competition Checker — JackpotKeywords</title>
        <meta name="description" content="Check keyword competition levels with real Google Ads data. Our keyword competition tool shows LOW/MEDIUM/HIGH ratings, CPC ranges, and opportunity scores." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/features/keyword-competition-checker" />
        <meta property="og:title" content="Keyword Competition Checker — JackpotKeywords" />
        <meta property="og:description" content="Check keyword competition levels with real Google Ads data. LOW/MEDIUM/HIGH ratings, CPC ranges, and opportunity scores." />
        <meta property="og:url" content="https://jackpotkeywords.web.app/features/keyword-competition-checker" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'JackpotKeywords Keyword Competition Checker',
            description: 'Keyword competition tool that checks competition levels using real Google Ads API data with LOW/MEDIUM/HIGH ratings, CPC ranges, and scoring.',
            url: 'https://jackpotkeywords.web.app/features/keyword-competition-checker',
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
            Keyword Competition Checker With Google Ads Data
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Know exactly how competitive a keyword is before you invest time or money. JackpotKeywords
            checks keyword competition using real Google Ads API data — showing LOW, MEDIUM, or HIGH
            ratings alongside CPC ranges, search volume, and opportunity scores. Find the keywords where
            you can actually win.
          </p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Check Competition Free
          </Link>
        </section>

        {/* Problem */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Why Keyword Competition Matters</h2>
          <div className="space-y-4 text-gray-400 leading-relaxed">
            <p>
              Targeting a keyword without checking its competition level is like entering a race without
              knowing who you are running against. High-competition keywords are dominated by established
              brands with massive budgets. You could spend months creating content or hundreds of dollars
              on ads with nothing to show for it.
            </p>
            <p>
              Keyword competition data tells you where the gaps are. LOW competition keywords with decent
              search volume are where small businesses win — in both organic search and paid advertising.
              The difference between a $2 click and a $22 click often comes down to choosing the right
              competition level.
            </p>
            <p>
              Most keyword competition tools either require expensive subscriptions or provide vague
              difficulty scores based on proprietary algorithms. JackpotKeywords gives you competition
              ratings straight from the Google Ads API — the same data Google uses to run its own ad auction.
            </p>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">How JackpotKeywords Analyzes Keyword Competition</h2>
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
          <h2 className="text-3xl font-bold text-white mb-8">Check Keyword Competition in 3 Steps</h2>
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
          <h2 className="text-3xl font-bold text-white mb-4">Find low-competition keywords that deliver</h2>
          <p className="text-gray-400 mb-8">3 free searches. No credit card required. Results in under 30 seconds.</p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Start Your Free Search
          </Link>
          <div className="mt-6 flex justify-center gap-6 text-sm">
            <Link to="/pricing" className="text-jackpot-400 hover:underline">See pricing</Link>
            <Link to="/blog/ppc-keyword-research" className="text-jackpot-400 hover:underline">
              Read: PPC Keyword Research Guide
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
