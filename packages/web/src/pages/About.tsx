import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function About() {
  return (
    <>
      <Helmet>
        <title>About — JackpotKeywords</title>
        <meta name="description" content="JackpotKeywords delivers real Google Ads keyword data and instant SEO audits at a fraction of SEMrush or Ahrefs prices. Built for indie founders, small SEO teams, and agencies." />
        <link rel="canonical" href="https://jackpotkeywords.web.app/about" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">About JackpotKeywords</h1>
        <p className="text-gray-500 text-sm mb-10">AI-powered keyword research and SEO audits, without the SEMrush price tag.</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-3">Why we built this</h2>
            <p>
              Keyword research and SEO audit tools used to cost $99-$140 a month — locking out
              indie founders, side-project builders, and small businesses who needed real data
              to make ranking decisions. JackpotKeywords delivers the same advertiser-grade
              metrics (search volume, CPC, competition, trend direction) for $9.99/mo Pro or
              $1.99 a search.
            </p>
            <p className="mt-2">
              The first three runs are free. No credit card, no trial sign-up, no asterisks.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">What we do</h2>
            <p>
              <span className="text-white font-medium">Keyword research:</span> describe a
              product or paste a URL, and we generate 1,000+ scored keywords across 10 intent
              categories — direct, feature, problem, audience, competitor, alternative, use
              case, niche, benefit, and adjacent. Each keyword gets a Jackpot Score combining
              volume, CPC, competition, and trend direction.
            </p>
            <p className="mt-2">
              <span className="text-white font-medium">SEO audits:</span> point us at a domain
              and we crawl up to 10 pages, score across 6 categories (technical, content,
              crawlability, structured data, local/geo, social), and surface keyword gap
              opportunities with real volume and CPC data — all in under a minute.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Where the data comes from</h2>
            <p>
              Four data sources combine to produce every search:
            </p>
            <ul className="mt-2 space-y-1.5 list-disc list-inside ml-2">
              <li><span className="text-white">Google Ads Keyword Planner</span> — real search volume, CPC ranges, and competition levels</li>
              <li><span className="text-white">Google Autocomplete</span> — real queries people actually type, expanded a–z from each seed</li>
              <li><span className="text-white">Google Trends</span> — overlay direction (rising, stable, falling) on the top scored keywords</li>
              <li><span className="text-white">Gemini AI</span> — seed generation, intent classification, opportunity scoring, clustering</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Pricing in plain English</h2>
            <ul className="space-y-1.5 list-disc list-inside ml-2">
              <li><span className="text-white">Free:</span> 3 lifetime runs (search or audit, your choice)</li>
              <li><span className="text-white">Single search:</span> $1.99 per credit</li>
              <li><span className="text-white">3-pack:</span> $4.99 ($1.66 each)</li>
              <li><span className="text-white">Pro:</span> $9.99/mo unlimited searches and audits</li>
            </ul>
            <p className="mt-3">
              See <Link to="/pricing" className="text-jackpot-400 hover:underline">full pricing</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">Who it&apos;s for</h2>
            <ul className="space-y-1.5 list-disc list-inside ml-2">
              <li>Indie founders launching a SaaS or product and needing keywords fast</li>
              <li>Small SEO teams who want real data without enterprise contracts</li>
              <li>Marketing agencies running site audits for clients</li>
              <li>Content writers researching topics that actually have demand</li>
              <li>PPC managers planning Google Ads campaigns</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            Questions or feedback? Email{' '}
            <a href="mailto:smythmyke@gmail.com" className="text-jackpot-400 hover:underline">
              smythmyke@gmail.com
            </a>
          </p>
          <Link to="/" className="text-jackpot-400 hover:underline text-sm mt-3 inline-block">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
