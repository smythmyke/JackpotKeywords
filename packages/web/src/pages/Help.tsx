import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Help() {
  return (
    <>
      <Helmet>
        <title>Help — JackpotKeywords</title>
        <link rel="canonical" href="https://jackpotkeywords.web.app/help" />
      </Helmet>
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-white mb-2">Help Center</h1>
      <p className="text-gray-500 text-sm mb-10">Guides and instructions for getting the most out of JackpotKeywords.</p>

      <div className="space-y-12 text-gray-300 text-sm leading-relaxed">
        {/* Google Ads Import */}
        <section id="google-ads-import">
          <h2 className="text-xl font-bold text-white mb-4">How to Import Keywords into Google Ads</h2>
          <p className="mb-4 text-gray-400">
            JackpotKeywords exports your selected keywords in a format compatible with Google Ads Editor.
            Follow these steps to create a campaign from your keyword research.
          </p>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Step 1: Download Google Ads Editor</h3>
              <p>Google Ads Editor is a free desktop application from Google. Download it from
                {' '}<span className="text-jackpot-400">ads.google.com/intl/en/home/tools/ads-editor/</span>
              </p>
              <p className="mt-2 text-gray-500">Available for Windows and Mac.</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Step 2: Sign In</h3>
              <p>Open Google Ads Editor and sign in with your Google Ads account. If you don&apos;t have one, create a free account at ads.google.com.</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Step 3: Import the CSV</h3>
              <p>In Google Ads Editor:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-400">
                <li>Click <span className="text-white">Account</span> in the top menu</li>
                <li>Select <span className="text-white">Import &rarr; From CSV</span></li>
                <li>Choose the downloaded <span className="text-white">*-google-ads.csv</span> file</li>
                <li>Click <span className="text-white">Open</span> and review the import summary</li>
              </ol>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Step 4: Review Your Keywords</h3>
              <p>All imported keywords are set to <span className="text-jackpot-400 font-medium">paused</span> by default for safety. Review them before activating:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                <li>Check keyword match types (default: Broad — consider changing to Phrase or Exact)</li>
                <li>Review the auto-generated ad groups (organized by intent category)</li>
                <li>Remove any keywords that aren&apos;t relevant to your campaign</li>
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Step 5: Set Budget and Bidding</h3>
              <p>Before publishing, configure your campaign settings:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                <li><span className="text-white">Daily budget</span> — start small ($5-10/day) and scale up</li>
                <li><span className="text-white">Bidding strategy</span> — &ldquo;Maximize Clicks&rdquo; is good for testing; switch to &ldquo;Manual CPC&rdquo; for control</li>
                <li><span className="text-white">Max CPC bids</span> — use the CPC ranges from your research as a guide</li>
                <li><span className="text-white">Geographic targeting</span> — set your target regions</li>
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Step 6: Add Ad Copy</h3>
              <p>Keywords alone won&apos;t create a complete campaign. You&apos;ll need to add:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
                <li><span className="text-white">Headlines</span> (up to 15, at least 3 required)</li>
                <li><span className="text-white">Descriptions</span> (up to 4, at least 2 required)</li>
                <li><span className="text-white">Final URL</span> — where clicks land (your product page)</li>
              </ul>
              <p className="mt-2 text-gray-500">Tip: Create 2-3 ad variations per ad group for A/B testing.</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Step 7: Post to Google Ads</h3>
              <p>Click <span className="text-white">Post</span> in the top-right corner to push your campaign to Google Ads. Everything starts paused — enable keywords and the campaign when you&apos;re ready to go live.</p>
            </div>
          </div>

          <div className="mt-6 bg-jackpot-500/10 border border-jackpot-500/20 rounded-xl p-4">
            <h3 className="font-bold text-jackpot-400 mb-2">Understanding the Export Format</h3>
            <p className="text-gray-400">Your exported CSV includes these columns:</p>
            <ul className="mt-2 space-y-1 text-gray-400">
              <li><span className="text-white">Campaign</span> — auto-named from your product label</li>
              <li><span className="text-white">Ad group</span> — organized by keyword intent category</li>
              <li><span className="text-white">Keyword</span> — the keyword text</li>
              <li><span className="text-white">Criterion Type</span> — match type (default: Broad)</li>
              <li><span className="text-white">Status</span> — paused (for safety)</li>
              <li><span className="text-white">Max CPC</span> — suggested bid based on low CPC data</li>
              <li><span className="text-white">Labels</span> — Jackpot Score for easy filtering in Ads Editor</li>
            </ul>
          </div>
        </section>

        {/* Scoring */}
        <section id="scoring">
          <h2 className="text-xl font-bold text-white mb-4">How Scoring Works</h2>
          <div className="space-y-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Jackpot Score (0-100)</h3>
              <p className="text-gray-400">Combines volume, CPC, competition, and trend data to identify the best overall opportunities. Higher is better.</p>
              <ul className="mt-2 space-y-1 text-gray-400">
                <li><span className="text-score-green font-medium">80-100 Jackpot</span> — high-value opportunity, act on these first</li>
                <li><span className="text-score-yellow font-medium">60-79 Solid</span> — good potential, worth considering</li>
                <li><span className="text-gray-500 font-medium">Below 60</span> — lower priority or competitive</li>
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Ad Score vs SEO Score</h3>
              <p className="text-gray-400">
                <span className="text-white">Ad Score</span> optimizes for paid advertising — favors low CPC + high volume.
                <br />
                <span className="text-white">SEO Score</span> optimizes for organic ranking — favors lower competition + search intent alignment.
              </p>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories">
          <h2 className="text-xl font-bold text-white mb-4">Keyword Categories Explained</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            {[
              ['Direct / Head Terms', 'Core keywords that describe your product category'],
              ['Feature-Based', 'Keywords targeting specific product features'],
              ['Problem-Based', 'Pain points and "how to" queries your product solves'],
              ['Audience-Based', 'Keywords identifying your target users by role or industry'],
              ['Competitor Brands', 'Names of competing products people search for'],
              ['Competitor Alternatives', '"Alternative to X", "best Y", comparison queries'],
              ['Use Case / Scenario', 'Specific situations where your product is needed'],
              ['Industry / Niche', 'Vertical-specific and sub-niche terminology'],
              ['Benefit / Outcome', 'Result-focused keywords — what users achieve'],
              ['Adjacent / Tangential', 'Related topics your audience also searches for'],
            ].map(([name, desc]) => (
              <div key={name}>
                <span className="text-white font-medium">{name}</span>
                <span className="text-gray-500"> — {desc}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-800 text-center">
        <Link to="/" className="text-jackpot-400 hover:underline text-sm">
          &larr; Back to Home
        </Link>
      </div>
    </div>
    </>
  );
}
