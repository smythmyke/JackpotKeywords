import { useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { AeoResult } from '@jackpotkeywords/shared';

interface AeoScanData extends AeoResult {
  id: string;
  domain: string;
  productName: string;
  createdAt?: string;
}

export default function AeoScanResults() {
  const location = useLocation();
  const result = (location.state as any)?.aeoResult as AeoScanData | undefined;
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);

  if (!result) return <Navigate to="/" replace />;

  const domain = result.domain || '';

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
      const { exportAeoPdf } = await import('../services/pdfExport');
      await exportAeoPdf(result);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>AEO Scan: {result.productName} — JackpotKeywords</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition mb-4 inline-block">
              &larr; Back to Search
            </Link>
            <h1 className="text-3xl font-bold mb-2">
              AEO Scan: <span className="text-jackpot-400">{result.productName}</span>
            </h1>
            <p className="text-gray-400">{domain}</p>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="mt-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {pdfExporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>

        {/* Visibility Score */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8 text-center">
          <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">AI Visibility Score</div>
          <p className="text-gray-500 text-xs mb-4">
            How often AI assistants (Gemini, ChatGPT, Perplexity) cite your product when buyers ask relevant questions.
          </p>
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
        </section>

        {/* Buyer Query Results — Table */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-1">Buyer Query Results</h2>
          <p className="text-gray-500 text-sm mb-4">
            We asked AI assistants {result.queriesChecked} buyer questions about your product category. Here&apos;s whether your site appeared in their answers.
          </p>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-24">Status</th>
                  <th className="text-left px-3 py-3 text-gray-400 font-medium">Buyer Query</th>
                  <th className="text-center px-3 py-3 text-gray-400 font-medium w-20">Sources</th>
                  <th className="text-left px-3 py-3 text-gray-400 font-medium w-44">Competitors</th>
                </tr>
              </thead>
              <tbody>
                {result.queries.map((q, i) => (
                  <tr key={i} className="group">
                    <td colSpan={4} className="p-0">
                      {/* Summary row */}
                      <div
                        className="flex items-center cursor-pointer hover:bg-gray-800/50 transition border-b border-gray-800/50"
                        onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                      >
                        <div className="px-4 py-3 w-24 shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                            q.productCited ? 'bg-green-500/20 text-score-green' :
                            q.productMentionedInAnswer ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {q.productCited ? 'CITED' : q.productMentionedInAnswer ? 'MENTIONED' : 'NOT FOUND'}
                          </span>
                        </div>
                        <div className="px-3 py-3 flex-1 min-w-0">
                          <span className="text-gray-300 text-sm line-clamp-1">{q.query}</span>
                        </div>
                        <div className="px-3 py-3 w-20 text-center shrink-0">
                          <span className="text-gray-500 text-xs">{q.citations.length}</span>
                        </div>
                        <div className="px-3 py-3 w-44 shrink-0">
                          <span className="text-gray-500 text-xs line-clamp-1">
                            {q.competitorsCited.length > 0 ? q.competitorsCited.join(', ') : '\u2014'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expandedRow === i && (
                        <div className="px-5 py-4 bg-gray-800/30 border-b border-gray-800">
                          <p className="text-gray-300 text-sm mb-3">{q.query}</p>
                          {q.answerSnippet && (
                            <p className="text-gray-400 text-xs mb-3 italic border-l-2 border-gray-700 pl-3">
                              &ldquo;{q.answerSnippet}&rdquo;
                            </p>
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Competitor Dominance */}
        {Object.keys(result.competitorFrequency).length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-1">Competitor Dominance</h2>
            <p className="text-gray-500 text-sm mb-4">
              How frequently competitors are cited across all queries. These brands are what AI currently recommends instead of yours.
            </p>
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
            <h2 className="text-xl font-bold text-white mb-1">Action Items</h2>
            <p className="text-gray-500 text-sm mb-4">
              Specific steps to increase your AI visibility based on the gaps found in this scan.
            </p>
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
