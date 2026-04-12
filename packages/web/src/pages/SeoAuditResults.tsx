import { useState } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEO_AUDIT_CATEGORY_LABELS, type SeoAuditCategory, type SeoAuditResult } from '@jackpotkeywords/shared';
import { useAuthContext } from '../contexts/AuthContext';
import ScoreGauge from '../components/audit/ScoreGauge';
import CategoryScoreCard from '../components/audit/CategoryScoreCard';
import CheckItem from '../components/audit/CheckItem';

const CATEGORIES: SeoAuditCategory[] = [
  'technical', 'content', 'crawlability', 'structured_data', 'local_geo', 'social_sharing',
];

/** Number of checklist items to show before blurring for unpaid users */
const FREE_PREVIEW_CHECKS = 4;

export default function SeoAuditResults() {
  const location = useLocation();
  const result = (location.state as any)?.result as SeoAuditResult | undefined;
  const [activeCategory, setActiveCategory] = useState<SeoAuditCategory | null>(null);
  const { user } = useAuthContext();

  if (!result) return <Navigate to="/seo-audit" replace />;

  // If user is authenticated, always show full results — even if result.paid
  // is false (e.g., user ran audit anonymously then logged in, or result was
  // from a free search). Server-side masking only applies to anonymous users.
  const paid = result.paid || !!user;

  const filteredChecks = activeCategory
    ? result.checks.filter((c) => c.category === activeCategory)
    : result.checks;

  const domain = result.domain.replace(/^https?:\/\//, '');

  // Split checks into visible and blurred for unpaid
  const visibleChecks = paid ? filteredChecks : filteredChecks.slice(0, FREE_PREVIEW_CHECKS);
  const blurredChecks = paid ? [] : filteredChecks.slice(FREE_PREVIEW_CHECKS);

  return (
    <>
      <Helmet>
        <title>SEO Audit Results — {domain}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
          <ScoreGauge score={result.overallScore} size={140} />
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-white mb-1">SEO Audit: {domain}</h1>
            <p className="text-gray-500 text-sm">
              {result.metadata.pagesAnalyzed} pages analyzed in {(result.metadata.executionTimeMs / 1000).toFixed(0)}s
              &middot; {new Date(result.createdAt).toLocaleDateString()}
            </p>
            <div className="flex gap-4 mt-3">
              <span className="text-sm">
                <span className="text-green-400 font-bold">{result.checks.filter((c) => c.status === 'pass').length}</span>
                <span className="text-gray-500"> passed</span>
              </span>
              <span className="text-sm">
                <span className="text-yellow-400 font-bold">{result.checks.filter((c) => c.status === 'warning').length}</span>
                <span className="text-gray-500"> warnings</span>
              </span>
              <span className="text-sm">
                <span className="text-red-400 font-bold">{result.checks.filter((c) => c.status === 'fail').length}</span>
                <span className="text-gray-500"> failures</span>
              </span>
            </div>
          </div>
        </div>

        {/* Category Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {CATEGORIES.map((cat) => {
            const cs = result.categoryScores[cat];
            return (
              <CategoryScoreCard
                key={cat}
                category={cat}
                score={cs?.score ?? 0}
                passed={cs?.passed ?? 0}
                total={cs?.total ?? 0}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              />
            );
          })}
        </div>

        {/* Active filter label */}
        {activeCategory && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">
              Showing: {SEO_AUDIT_CATEGORY_LABELS[activeCategory]}
            </span>
            <button
              onClick={() => setActiveCategory(null)}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              (show all)
            </button>
          </div>
        )}

        {/* Checklist — multi-column layout */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">
            SEO Checklist ({filteredChecks.length} items)
          </h2>

          {/* Visible checks in 2 columns */}
          {visibleChecks.length > 0 && (
            <div className="grid md:grid-cols-2 gap-x-4">
              {visibleChecks.map((check) => (
                <div key={check.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 mb-3">
                  <CheckItem check={check} paid={paid} />
                </div>
              ))}
            </div>
          )}

          {/* Blurred checks for unpaid users */}
          {blurredChecks.length > 0 && (
            <div className="relative mt-2">
              <div className="grid md:grid-cols-2 gap-x-4 blur-[6px] select-none pointer-events-none">
                {blurredChecks.map((check) => (
                  <div key={check.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 mb-3">
                    <CheckItem check={check} paid={false} />
                  </div>
                ))}
              </div>
              {/* Unlock overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-gray-950/80 backdrop-blur-sm rounded-2xl px-8 py-6 border border-gray-800">
                  <p className="text-white font-bold text-lg mb-2">
                    +{blurredChecks.length} more checks found
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Sign in to see all results and recommendations
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-2.5 rounded-lg transition"
                  >
                    Unlock Full Report
                  </Link>
                </div>
              </div>
            </div>
          )}

          {filteredChecks.length === 0 && (
            <p className="text-gray-500 text-sm py-4 text-center">No checks in this category</p>
          )}
        </section>

        {/* Page-by-Page Analysis */}
        {result.pageResults.length > 1 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Page Analysis ({result.pageResults.length} pages)
            </h2>
            <div className="space-y-3">
              {result.pageResults.map((page) => (
                <details
                  key={page.url}
                  className="bg-gray-900 border border-gray-800 rounded-xl group"
                >
                  <summary className="px-4 py-3 cursor-pointer hover:bg-gray-800/50 rounded-xl transition flex items-center gap-3">
                    <span className="text-gray-500 text-sm shrink-0 group-open:rotate-90 transition-transform">&#9654;</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {page.title || page.url}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{page.url}</div>
                    </div>
                    {page.issues.length > 0 && (
                      <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded shrink-0 ml-auto">
                        {page.issues.length} issues
                      </span>
                    )}
                  </summary>
                  <div className="px-4 pb-4 border-t border-gray-800">
                    <div className="grid grid-cols-2 gap-4 py-3 text-sm">
                      <div>
                        <span className="text-gray-500">Title:</span>{' '}
                        <span className="text-gray-300">{page.title || 'Missing'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">H1:</span>{' '}
                        <span className="text-gray-300">{page.h1 || 'Missing'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Meta:</span>{' '}
                        <span className="text-gray-300">{page.metaDescription ? `${page.metaDescription.slice(0, 80)}...` : 'Missing'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Words:</span>{' '}
                        <span className="text-gray-300">{page.wordCount || 'N/A'}</span>
                      </div>
                    </div>
                    {page.issues.length > 0 && (
                      <div className="mt-2">
                        {page.issues.map((issue) => (
                          <CheckItem key={issue.id} check={issue} paid={paid} />
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Keyword Gaps */}
        {result.keywordGaps.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Keyword Gap Opportunities ({result.keywordGaps.length})
            </h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Keyword</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Opportunity</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {result.keywordGaps.map((gap, i) => {
                    const isLocked = !paid && gap.keyword.startsWith('\u2022\u2022\u2022');
                    return (
                      <tr key={i} className="border-b border-gray-800/50 last:border-0">
                        <td className={`px-4 py-3 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-white font-medium'}`}>
                          {gap.keyword}
                        </td>
                        <td className={`px-4 py-3 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-gray-400'}`}>
                          {gap.opportunity}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            gap.difficulty === 'easy' ? 'bg-green-400/10 text-green-400' :
                            gap.difficulty === 'hard' ? 'bg-red-400/10 text-red-400' :
                            'bg-yellow-400/10 text-yellow-400'
                          }`}>
                            {gap.difficulty}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Recommendations */}
        {result.recommendations.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Recommendations ({result.recommendations.length})
            </h2>
            <div className="space-y-3">
              {result.recommendations.map((rec, i) => {
                const isLocked = !paid && rec.title.startsWith('\u2022\u2022\u2022');
                return (
                  <div
                    key={i}
                    className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${isLocked ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`text-lg font-bold shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        rec.impact === 'high' ? 'bg-red-400/10 text-red-400' :
                        rec.impact === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-white'}`}>
                          {rec.title}
                        </div>
                        <p className={`text-sm mt-1 ${isLocked ? 'text-gray-600 blur-sm select-none' : 'text-gray-400'}`}>
                          {rec.description}
                        </p>
                        {!isLocked && (
                          <div className="flex gap-2 mt-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              rec.impact === 'high' ? 'bg-red-400/10 text-red-400' :
                              rec.impact === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                              'bg-gray-800 text-gray-500'
                            }`}>
                              {rec.impact} impact
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                              {rec.effort} effort
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                              {SEO_AUDIT_CATEGORY_LABELS[rec.category as SeoAuditCategory] || rec.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Paywall CTA for unpaid users */}
        {!paid && (
          <section className="text-center py-10 border-t border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-3">Unlock the Full Report</h2>
            <p className="text-gray-400 mb-6 max-w-lg mx-auto">
              See all {filteredChecks.length} checklist items, recommendations, keyword gap opportunities, and specific fixes for every issue found.
            </p>
            <Link
              to="/pricing"
              className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition"
            >
              Unlock for $1.99
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              Or go Pro for $9.99/mo — unlimited audits + keyword research
            </p>
          </section>
        )}

        {/* Upsell to keyword research — shown for paid users */}
        {paid && (
          <section className="py-10 border-t border-gray-800 relative overflow-hidden">
            <div
              className="absolute inset-0 bg-center bg-cover opacity-[0.08] pointer-events-none"
              style={{ backgroundImage: "url('/bg-coins.png')" }}
              role="presentation"
              aria-hidden="true"
            />
            <div className="text-center relative z-10">
              <h2 className="text-2xl font-bold text-white mb-3">
                Now Find the <span className="text-jackpot-400">Keywords</span> to Fix These Gaps
              </h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Your audit found {result.keywordGaps.length} keyword gaps and {result.checks.filter((c) => c.status === 'warning' || c.status === 'fail').length} issues to fix.
                Run a keyword search to get 1,000+ scored keywords with real Google Ads data — volume, CPC, competition, and intent labels.
              </p>
              <Link
                to="/"
                className="inline-block bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-8 py-3.5 rounded-xl text-lg transition"
              >
                Find Keywords for {domain} &rarr;
              </Link>
            </div>
          </section>
        )}

        {/* Cross-link for all users */}
        <div className="text-center mt-8">
          <Link to="/seo-audit" className="text-sm text-gray-500 hover:text-gray-300 transition">
            Run another SEO audit &rarr;
          </Link>
        </div>
      </div>
    </>
  );
}
