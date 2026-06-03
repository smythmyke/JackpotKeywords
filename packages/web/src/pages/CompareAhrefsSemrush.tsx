import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const URL = 'https://jackpotkeywords.web.app/compare/ahrefs-vs-semrush';

// Comparison rows. Pricing as of June 2026 — verify on each vendor's site.
const ROWS: { label: string; jk: string; ahrefs: string; semrush: string; uber: string; ser: string }[] = [
  { label: 'Entry price (monthly)', jk: '$9.99/mo (or $1.99/search)', ahrefs: '$129/mo (Lite)¹', semrush: '~$139.95/mo (Pro)', uber: '$29/mo', ser: '~$52/mo²' },
  { label: 'Free tier', jk: '3 free searches/audits, no card', ahrefs: 'Free data on your own site only', semrush: 'Limited free + 7-day trial', uber: '7-day trial', ser: '14-day trial' },
  { label: 'Keyword data source', jk: 'Google Ads Keyword Planner', ahrefs: 'Own clickstream model', semrush: 'Own database/model', uber: 'Google Keyword Planner', ser: 'Google Ads + own' },
  { label: 'AI keyword generation from a plain-English description', jk: 'Yes', ahrefs: 'No (needs seed/domain)', semrush: 'No', uber: 'No', ser: 'No' },
  { label: 'AI-visibility / AEO scan (cited by ChatGPT & Gemini?)', jk: 'Yes', ahrefs: 'No', semrush: 'No', uber: 'No', ser: 'No' },
  { label: 'Backlink analysis', jk: 'No', ahrefs: 'Yes (core)', semrush: 'Yes', uber: 'Yes', ser: 'Yes' },
  { label: 'Rank / position tracking', jk: 'No', ahrefs: 'Yes', semrush: 'Yes', uber: 'Yes', ser: 'Yes' },
  { label: 'Site audit', jk: 'Lightweight (~10 pages)', ahrefs: 'Full (1000s of pages)', semrush: 'Full', uber: 'Yes', ser: 'Yes' },
  { label: 'Best for', jk: 'Indie / SMB: real keyword data + AI visibility, cheap', ahrefs: 'Agencies: backlinks + competitive depth', semrush: 'Agencies: all-in-one suite', uber: 'Budget all-rounder', ser: 'Budget all-in-one' },
];

const FAQ = [
  {
    q: 'Is JackpotKeywords a replacement for Ahrefs or SEMrush?',
    a: 'No — and we will not pretend it is. Ahrefs and SEMrush are full SEO suites with backlink analysis, rank tracking, and large-scale site audits. JackpotKeywords does keyword research with real Google Ads data, a lightweight SEO audit, and AI-visibility (AEO) scanning. If you need backlinks or rank tracking, choose Ahrefs or SEMrush. If you mainly need to find the right keywords and check your AI visibility without enterprise pricing, JackpotKeywords is built for you.',
  },
  {
    q: 'How is JackpotKeywords so much cheaper?',
    a: 'JackpotKeywords focuses on one job — finding goldmine keywords with real data — instead of bundling backlinks, rank tracking, and competitive analytics. That focus is why it is about 1/14th the price of SEMrush Pro: $9.99/month for unlimited searches, or $1.99 for a single search, versus $129–$140/month.',
  },
  {
    q: 'Where does the keyword data come from?',
    a: 'JackpotKeywords pulls search volume, CPC, and competition directly from the Google Ads Keyword Planner — the same advertiser data Google uses. Ahrefs and SEMrush use their own clickstream-based models. Ubersuggest also uses Google data, similar to JackpotKeywords.',
  },
  {
    q: 'What can JackpotKeywords do that Ahrefs and SEMrush cannot?',
    a: 'Two things. First, it generates keywords from a plain-English product description — no seed keyword or domain required. Second, it runs an AI-visibility (AEO) scan that checks whether ChatGPT, Gemini, and other AI answer engines cite your site. Neither Ahrefs nor SEMrush offers AEO scanning today.',
  },
];

function Cell({ value, highlight }: { value: string; highlight?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm align-top ${highlight ? 'text-white font-medium' : 'text-gray-400'}`}>
      {value}
    </td>
  );
}

export default function CompareAhrefsSemrush() {
  return (
    <>
      <Helmet>
        <title>JackpotKeywords vs Ahrefs vs SEMrush: The Affordable AI Alternative</title>
        <meta name="description" content="JackpotKeywords vs Ahrefs vs SEMrush compared (2026): pricing, data source, AI features, and what each does best. Real Google Ads data and AI-visibility scans from $9.99/mo — about 1/14th the price." />
        <link rel="canonical" href={URL} />
        <meta property="og:title" content="JackpotKeywords vs Ahrefs vs SEMrush: The Affordable AI Alternative" />
        <meta property="og:description" content="Honest 2026 comparison: pricing, data source, AI features, and what each tool does best. Real Google Ads data + AI-visibility from $9.99/mo." />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="JackpotKeywords vs Ahrefs vs SEMrush: The Affordable AI Alternative" />
        <meta name="twitter:description" content="Honest 2026 comparison: pricing, data source, AI features, and what each tool does best." />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'JackpotKeywords',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: 'Affordable AI keyword research with real Google Ads data, a lightweight SEO audit, and AI-visibility (AEO) scanning — an alternative to Ahrefs and SEMrush for indie makers and small businesses.',
            url: 'https://jackpotkeywords.web.app',
            offers: [
              { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free — 3 searches, no card' },
              { '@type': 'Offer', price: '9.99', priceCurrency: 'USD', description: 'Pro — unlimited searches/month' },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          })}
        </script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            JackpotKeywords vs Ahrefs vs SEMrush
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            An honest 2026 comparison. JackpotKeywords is the affordable, AI-first alternative — real
            Google Ads keyword data and AI-visibility scans from <strong className="text-white">$9.99/mo</strong>,
            about <strong className="text-white">1/14th the price</strong> of SEMrush Pro. It is not a full
            SEO suite, and below we are upfront about exactly where Ahrefs and SEMrush are the better choice.
          </p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Try 3 Free Searches
          </Link>
        </section>

        {/* TL;DR */}
        <section className="mb-12 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-3">The short version</h2>
          <ul className="space-y-2 text-gray-400 text-sm leading-relaxed list-disc pl-5">
            <li><strong className="text-white">Choose JackpotKeywords</strong> if you want real Google keyword data, AI keyword ideas from a plain description, and an AI-visibility check — cheaply, without a contract.</li>
            <li><strong className="text-white">Choose Ahrefs</strong> if backlink analysis and competitive depth are your priority.</li>
            <li><strong className="text-white">Choose SEMrush</strong> if you want one all-in-one suite covering SEO, ads, content, and social.</li>
          </ul>
        </section>

        {/* Comparison table */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Side-by-side comparison</h2>
          <div className="overflow-x-auto border border-gray-800 rounded-xl">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300"> </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-jackpot-400">JackpotKeywords</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Ahrefs</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">SEMrush</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Ubersuggest</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">SE Ranking</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr key={r.label} className={i % 2 ? 'bg-gray-900/40' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-300 align-top">{r.label}</td>
                    <Cell value={r.jk} highlight />
                    <Cell value={r.ahrefs} />
                    <Cell value={r.semrush} />
                    <Cell value={r.uber} />
                    <Cell value={r.ser} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-xs mt-3 leading-relaxed">
            Pricing as of June 2026; verify on each vendor&apos;s site:{' '}
            <a href="https://ahrefs.com/pricing" className="text-jackpot-400 hover:underline" rel="nofollow noopener" target="_blank">ahrefs.com/pricing</a>,{' '}
            <a href="https://www.semrush.com/pricing/" className="text-jackpot-400 hover:underline" rel="nofollow noopener" target="_blank">semrush.com/pricing</a>.{' '}
            ¹ Ahrefs also offers a limited Starter plan at $29/mo and free data for your own verified site; Lite ($129/mo) is the practical professional entry.{' '}
            ² SE Ranking uses keyword-volume-based tiers; ~$52/mo is the annual entry.
          </p>
        </section>

        {/* Where JK wins */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Where JackpotKeywords wins</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Real Google Ads data</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Search volume, CPC, and competition come straight from the Google Ads Keyword Planner — the same source Google shows advertisers. Ahrefs and SEMrush use their own clickstream models.</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Keywords from a plain description</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Describe your product in plain English and AI generates keywords across 12 intent categories — no seed keyword or competitor domain required. The big suites need you to start with one.</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">AI-visibility (AEO) scanning</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Check whether ChatGPT, Gemini, and other AI answer engines cite your site for buyer questions. As search shifts to AI answers, this is the visibility metric the legacy suites do not measure yet.</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Price + no contract</h3>
              <p className="text-gray-400 text-sm leading-relaxed">$9.99/mo unlimited, or $1.99 for a single search, with 3 free searches and no credit card. Roughly 1/14th the cost of SEMrush Pro and no annual lock-in.</p>
            </div>
          </div>
        </section>

        {/* Where they win — the honest part */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Where Ahrefs &amp; SEMrush win — and when to pick them</h2>
          <div className="space-y-4 text-gray-400 leading-relaxed">
            <p>
              JackpotKeywords is <strong className="text-white">not a full SEO suite</strong>, and pretending otherwise would not help you. If any of these are core to your work, Ahrefs or SEMrush is the right tool:
            </p>
            <ul className="space-y-2 text-sm list-disc pl-5">
              <li><strong className="text-white">Backlink analysis</strong> — Ahrefs and SEMrush maintain massive backlink indexes. JackpotKeywords does not analyze backlinks at all.</li>
              <li><strong className="text-white">Rank / position tracking</strong> — both track your keyword rankings over time across locations. JackpotKeywords does not.</li>
              <li><strong className="text-white">Large-scale site audits</strong> — Ahrefs and SEMrush crawl thousands of pages. JackpotKeywords runs a lightweight audit (about 10 pages) plus an AI-visibility scan.</li>
              <li><strong className="text-white">Competitive traffic &amp; content intelligence</strong> — the suites estimate competitor traffic, keyword gaps at scale, and content topics. That is their domain, not ours.</li>
            </ul>
            <p>
              Plenty of teams run <strong className="text-white">JackpotKeywords alongside</strong> a suite — using it for fast, real-data keyword discovery and AI-visibility checks while keeping Ahrefs or SEMrush for backlinks and rank tracking.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">FAQ</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-base font-bold text-white mb-2">{f.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center py-12 border-t border-gray-800">
          <h2 className="text-3xl font-bold text-white mb-4">See the data for yourself</h2>
          <p className="text-gray-400 mb-8">3 free searches with real Google Ads data. No credit card required.</p>
          <Link
            to="/"
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
          >
            Start Your Free Search
          </Link>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
            <Link to="/pricing" className="text-jackpot-400 hover:underline">See pricing</Link>
            <Link to="/blog/best-keyword-research-tool-2026" className="text-jackpot-400 hover:underline">2026 tool comparison</Link>
            <Link to="/seo-audit" className="text-jackpot-400 hover:underline">Free SEO audit</Link>
          </div>
        </section>
      </div>
    </>
  );
}
