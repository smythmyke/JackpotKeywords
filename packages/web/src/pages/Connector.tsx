import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SUPPORT_EMAIL = 'smythmyke@gmail.com';
const MCP_URL = 'https://jackpotkeywords.web.app/api/mcp';

interface Tool {
  name: string;
  title: string;
  cost: string;
  desc: string;
}

const TOOLS: Tool[] = [
  {
    name: 'jackpotkeywords_recommend',
    title: 'Keyword research (free monthly report)',
    cost: 'Free — 1 report/month',
    desc: 'Full keyword-research pipeline: ranked keyword recommendations by composite Jackpot Score (volume, CPC, competition, trend, AI relevance), backed by real Google Ads Keyword Planner data. Starts a background job — fetch the report with the get_report tool.',
  },
  {
    name: 'jackpotkeywords_recommend_deep',
    title: 'Deep keyword research',
    cost: '$0.30 / run',
    desc: 'Everything recommend does plus competitor discovery, keyword clusters, and per-category aggregates.',
  },
  {
    name: 'jackpotkeywords_audit',
    title: 'SEO site audit',
    cost: '$0.50 / run',
    desc: 'Crawls up to 10 pages and scores titles, meta descriptions, headings, structured data, sitemap/robots, Open Graph, and more, with prioritized fixes.',
  },
  {
    name: 'jackpotkeywords_aeo_scan',
    title: 'AI visibility (AEO) scan',
    cost: '$1.00 / run',
    desc: 'Checks whether AI assistants and AI-powered search mention your product for relevant queries, and reports gaps with recommendations.',
  },
  {
    name: 'jackpotkeywords_get_report',
    title: 'Get research report',
    cost: 'Free',
    desc: 'Fetches the status or finished result of any research job started by the tools above. If a job is still running, ask again ~30 seconds later.',
  },
  {
    name: 'jackpotkeywords_usage_status',
    title: 'Free usage status',
    cost: 'Free',
    desc: 'How many free keyword reports remain this month and when the allowance resets.',
  },
  {
    name: 'jackpotkeywords_credit_balance',
    title: 'Credit balance',
    cost: 'Free',
    desc: 'Your prepaid credit balance in USD.',
  },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "The connector's tools don't appear in my chat",
    a: 'Connectors are toggled per-conversation. Open the tools / connectors menu in the chat input, find JackpotKeywords, and switch it on for that conversation.',
  },
  {
    q: 'Sign-in loop or "couldn\'t connect"',
    a: 'Remove the connector and add it again with the exact URL above. Sign in with the email you want your account (free report + credits) attached to — a one-time code is emailed to you, no password needed.',
  },
  {
    q: 'A research tool returned a job id but no keywords',
    a: 'That\'s expected: research takes 1–3 minutes, so the tool starts a background job. Ask Claude to "check the report" (it calls jackpotkeywords_get_report with the job id). If the job failed, your free report or credits are refunded automatically.',
  },
  {
    q: 'It says my free report is used up',
    a: 'The free tier includes 1 full keyword report per calendar month, resetting on the 1st. The deep research, audit, and AEO scan tools run on prepaid credits ($2.00 starter credit is included with every new account).',
  },
  {
    q: 'How do I add credits?',
    a: 'Sign in at jackpotkeywords.web.app with the same email you used to connect, then top up from the account page. Credits are shared between the connector and the REST API.',
  },
];

export default function Connector() {
  return (
    <>
      <Helmet>
        <title>Claude Connector — JackpotKeywords</title>
        <meta
          name="description"
          content="Use JackpotKeywords inside Claude: AI keyword research from a plain-English description, SEO audits, and AI-visibility scans. Setup guide, tool reference, and troubleshooting."
        />
        <link rel="canonical" href="https://jackpotkeywords.web.app/connector" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">JackpotKeywords for Claude</h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Run real keyword research without leaving your Claude conversation:
            describe a product in plain English (or give a URL) and get ranked
            keyword opportunities backed by Google Ads Keyword Planner data —
            plus SEO audits and AI-visibility scans.
          </p>
        </div>

        <div className="space-y-14 text-gray-300 text-sm leading-relaxed">
          {/* Setup */}
          <section id="setup">
            <h2 className="text-2xl font-bold text-white mb-2">Setup</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-400">
              <li>
                In Claude (web, desktop, or mobile), open{' '}
                <span className="text-gray-200">Settings → Connectors → Add custom connector</span>
                {' '}— or install from the Connector Directory if listed.
              </li>
              <li>
                Enter the connector URL:{' '}
                <code className="text-jackpot-300 font-mono break-all">{MCP_URL}</code>
              </li>
              <li>
                Complete sign-in: enter your email and the one-time code we send
                you. No password or prior account needed — your account is
                created on first sign-in with a free monthly keyword report and
                $2.00 of starter credit.
              </li>
              <li>
                In a chat, open the tools menu and toggle{' '}
                <span className="text-gray-200">JackpotKeywords</span> on, then try:{' '}
                <em className="text-gray-200">
                  &ldquo;Find low-competition keywords for my AI meeting-notes app.&rdquo;
                </em>
              </li>
            </ol>
            <p className="mt-3 text-xs text-gray-500">
              Keyword research runs as a 1–3 minute background job — Claude gets a
              job id immediately and fetches the finished report for you.
            </p>
          </section>

          {/* Tools */}
          <section id="tools">
            <h2 className="text-2xl font-bold text-white mb-2">Tools</h2>
            <div className="space-y-3">
              {TOOLS.map((t) => (
                <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                    <h3 className="font-mono text-white">{t.name}</h3>
                    <span className="text-jackpot-300 font-bold">{t.cost}</span>
                  </div>
                  <p className="text-gray-500 text-xs mb-1">{t.title}</p>
                  <p className="text-gray-400">{t.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Failed runs are refunded automatically — a free report goes back to
              your monthly allowance, credit charges back to your balance.
            </p>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting">
            <h2 className="text-2xl font-bold text-white mb-2">Troubleshooting</h2>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <div key={f.q}>
                  <h3 className="font-semibold text-white">{f.q}</h3>
                  <p className="text-gray-400">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Privacy + support */}
          <section id="support">
            <h2 className="text-2xl font-bold text-white mb-2">Data &amp; support</h2>
            <p className="text-gray-400">
              The connector only accesses what you ask it to research. Your
              account (email, credit balance, research jobs) is stored to provide
              the service — see the{' '}
              <Link to="/privacy" className="text-jackpot-400 hover:text-jackpot-300">
                privacy policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="text-jackpot-400 hover:text-jackpot-300">
                terms
              </Link>
              . Questions or problems:{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-jackpot-400 hover:text-jackpot-300">
                {SUPPORT_EMAIL}
              </a>
              . Prefer a REST API? See{' '}
              <Link to="/developers" className="text-jackpot-400 hover:text-jackpot-300">
                /developers
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
