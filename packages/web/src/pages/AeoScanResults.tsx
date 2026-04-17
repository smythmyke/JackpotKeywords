import { useLocation, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { AeoResult } from '@jackpotkeywords/shared';

interface AeoScanData extends AeoResult {
  id: string;
  domain: string;
  productName: string;
}

export default function AeoScanResults() {
  const location = useLocation();
  const result = (location.state as any)?.aeoResult as AeoScanData | undefined;

  if (!result) return <Navigate to="/" replace />;

  const domain = result.domain || '';

  return (
    <>
      <Helmet>
        <title>AEO Scan: {result.productName} — JackpotKeywords</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition mb-4 inline-block">
            &larr; Back to Search
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            AEO Scan: <span className="text-jackpot-400">{result.productName}</span>
          </h1>
          <p className="text-gray-400">{domain}</p>
        </div>

        {/* Visibility Score */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8 text-center">
          <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">AI Visibility Score</div>
          <div className={`text-6xl font-bold mb-3 ${
            result.visibilityScore >= 60 ? 'text-score-green' :
            result.visibilityScore >= 30 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {result.visibilityScore}
            <span className="text-2xl text-gray-500">/100</span>
          </div>
          <div className="flex justify-center gap-8 text-sm text-gray-400">
            <div>
              <span className="text-white font-bold text-lg">{result.queriesCited}</span>
              <span className="text-gray-500">/{result.queriesChecked}</span>
              <div>queries cite your site</div>
            </div>
            <div>
              <span className="text-white font-bold text-lg">{result.queriesMentioned}</span>
              <span className="text-gray-500">/{result.queriesChecked}</span>
              <div>answers mention you</div>
            </div>
          </div>
        </div>

        {/* Per-query results */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Buyer Query Results</h2>
          <div className="space-y-3">
            {result.queries.map((q, i) => (
              <details key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 cursor-pointer flex items-center justify-between hover:bg-gray-800/50 transition">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                      q.productCited ? 'bg-green-500/20 text-score-green' :
                      q.productMentionedInAnswer ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {q.productCited ? 'CITED' : q.productMentionedInAnswer ? 'MENTIONED' : 'NOT FOUND'}
                    </span>
                    <span className="text-gray-300 text-sm truncate">{q.query}</span>
                  </div>
                  <span className="text-gray-600 text-xs ml-2">{q.citations.length} sources</span>
                </summary>
                <div className="px-5 pb-4 border-t border-gray-800">
                  {q.answerSnippet && (
                    <p className="text-gray-400 text-xs mt-3 mb-3 italic">&ldquo;{q.answerSnippet}&rdquo;</p>
                  )}
                  {q.competitorsCited.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-gray-500">Competitors in this answer: </span>
                      <span className="text-xs text-red-400">{q.competitorsCited.join(', ')}</span>
                    </div>
                  )}
                  {q.citations.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Sources cited:</span>
                      {q.citations.slice(0, 5).map((c, ci) => {
                        const isOurs = c.url.toLowerCase().includes(domain.replace(/^https?:\/\//, '').replace(/^www\./, ''));
                        return (
                          <div key={ci} className={`text-xs py-1 ${isOurs ? 'text-jackpot-400 font-medium' : 'text-gray-400'}`}>
                            {isOurs && <span className="mr-1">&gt;&gt;&gt;</span>}
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {c.title || c.url}
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Competitor Dominance */}
        {Object.keys(result.competitorFrequency).length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Competitor Dominance</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="space-y-3">
                {Object.entries(result.competitorFrequency)
                  .sort(([, a], [, b]) => b - a)
                  .map(([comp, count]) => (
                    <div key={comp} className="flex items-center gap-3">
                      <span className="text-gray-300 text-sm w-32 truncate">{comp}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-3">
                        <div
                          className="bg-red-400/70 h-3 rounded-full transition-all"
                          style={{ width: `${(count / result.queriesChecked) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-sm w-16 text-right">
                        {count}/{result.queriesChecked}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Action Items */}
        {result.actionItems.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Action Items</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <ol className="space-y-3">
                {result.actionItems.map((item, i) => (
                  <li key={i} className="text-gray-300 text-sm flex gap-3">
                    <span className="text-jackpot-400 font-bold text-lg leading-tight">{i + 1}.</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 p-8 bg-gray-900 border border-gray-800 rounded-xl text-center">
          <h2 className="text-2xl font-bold mb-3">
            Want to improve your <span className="text-jackpot-400">AI visibility</span>?
          </h2>
          <p className="text-gray-400 mb-6">
            Run a full keyword research to find the content topics that will get your site cited by AI assistants.
          </p>
          <Link
            to="/"
            state={{ prefillQuery: result.productName }}
            className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3 rounded-xl text-lg transition"
          >
            Find Keywords for {result.productName} &rarr;
          </Link>
        </div>
      </div>
    </>
  );
}
