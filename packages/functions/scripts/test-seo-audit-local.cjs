/**
 * Throwaway local check for the SEO-audit expansion (checks #1-9). Runs the real
 * audit against a live URL with AEO skipped. Gemini calls degrade gracefully if
 * GEMINI_API_KEY is unset (insights empty) — we only care about the new
 * deterministic + performance checks here. Needs PAGESPEED_API_KEY for #8.
 *   node scripts/test-seo-audit-local.cjs [url]
 */
const { runSeoAudit } = require('../lib/services/seoAudit');

(async () => {
  const url = process.argv[2] || 'https://jackpotkeywords.web.app';
  console.log(`Auditing ${url} (includeAeo:false)\n`);
  const r = await runSeoAudit(url, { includeAeo: false });

  console.log('Overall:', r.overallScore + '/100');
  console.log('\nCategory scores:');
  for (const [cat, s] of Object.entries(r.categoryScores)) {
    console.log(`  ${cat.padEnd(16)} ${s.score === null ? 'N/A' : s.score + '/100'}  (${s.passed}/${s.total})`);
  }

  console.log('\nNEW checks (#1-9):');
  const newId = /^(sitemap_in_robots|sitemap_not_in_robots|sitemap_format|canonical_ok|canonical_mismatch|http_ok|http_redirect|http_error|x_robots_noindex|ai_crawlers|llms_txt|img_alt|perf_)/;
  const hits = r.checks.filter((c) => newId.test(c.id));
  for (const c of hits) console.log(`  [${c.status.toUpperCase()}] ${c.label}: ${c.details}`);
  console.log(`\n(${hits.length} new checks fired)`);
  console.log('performanceMetrics:', JSON.stringify(r.performanceMetrics));
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
