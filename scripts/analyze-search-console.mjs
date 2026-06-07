// Pulls Search Console data (sitemaps, top pages, top queries) and surfaces
// improvement opportunities. Reads creds from packages/functions/.env.
// Usage: node scripts/analyze-search-console.mjs [days] [siteUrl]
//        siteUrl can be a URL prefix ("https://example.com/") or a domain
//        property identifier ("sc-domain:example.com"). Run scripts/list-gsc-sites.mjs
//        to see accessible properties.
import { readFileSync } from 'fs';
import { google } from 'googleapis';

const DAYS = Number(process.argv[2]) || 28;
const SITE_URL = process.argv[3] || 'https://jackpotkeywords.web.app/';
const stripHost = (u) => u.replace(/^https?:\/\/[^/]+/, '');

const env = Object.fromEntries(
  readFileSync('packages/functions/.env', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const oauth2 = new google.auth.OAuth2(
  env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
  env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
);
oauth2.setCredentials({ refresh_token: env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN });
const wm = google.webmasters({ version: 'v3', auth: oauth2 });

const fmt = (d) => d.toISOString().split('T')[0];
const endDate = new Date();
endDate.setDate(endDate.getDate() - 2); // SC data lags ~2 days
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - DAYS);

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}
function padR(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : ' '.repeat(n - s.length) + s;
}

async function querySC(dimensions, rowLimit = 200) {
  const res = await wm.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions,
      rowLimit,
    },
  });
  return res.data.rows || [];
}

// Expected CTR by position (industry approximation; used to flag underperformers)
const EXPECTED_CTR = {
  1: 0.30, 2: 0.15, 3: 0.10, 4: 0.07, 5: 0.05,
  6: 0.04, 7: 0.03, 8: 0.025, 9: 0.02, 10: 0.018,
};
const expectedCtrFor = (pos) => {
  const p = Math.round(pos);
  if (p <= 10) return EXPECTED_CTR[p] || 0.018;
  if (p <= 20) return 0.01;
  return 0.005;
};

async function main() {
  console.log(`\nSearch Console analysis for ${SITE_URL}`);
  console.log(`Date range: ${fmt(startDate)} → ${fmt(endDate)} (${DAYS} days)\n`);

  // ───── Sitemaps ─────
  console.log('═══ SITEMAPS ═══');
  try {
    const sm = await wm.sitemaps.list({ siteUrl: SITE_URL });
    const list = sm.data.sitemap || [];
    if (!list.length) {
      console.log('  (no sitemaps submitted)');
    } else {
      for (const s of list) {
        const submitted = s.contents?.[0]?.submitted ?? '?';
        const indexed = s.contents?.[0]?.indexed ?? '?';
        console.log(`  ${s.path}`);
        console.log(`    type=${s.type}  lastSubmitted=${s.lastSubmitted || '?'}  lastDownloaded=${s.lastDownloaded || '?'}`);
        console.log(`    submitted=${submitted}  indexed=${indexed}  errors=${s.errors || 0}  warnings=${s.warnings || 0}`);
        if (s.isPending) console.log(`    ⚠ pending`);
        if (s.isSitemapsIndex) console.log(`    (sitemap index)`);
      }
    }
  } catch (err) {
    console.log(`  ✗ sitemap fetch failed: ${err.message}`);
  }
  console.log('');

  // ───── Pages with impressions (proxy for indexed pages with traffic) ─────
  console.log('═══ PAGES WITH SEARCH IMPRESSIONS (proxy for indexed) ═══');
  const pages = await querySC(['page'], 500);
  pages.sort((a, b) => b.impressions - a.impressions);
  console.log(`  Total pages appearing in search: ${pages.length}`);
  console.log(`  Total impressions: ${pages.reduce((s, p) => s + p.impressions, 0)}`);
  console.log(`  Total clicks: ${pages.reduce((s, p) => s + p.clicks, 0)}\n`);
  console.log(`  ${pad('PAGE', 70)} ${padR('IMPR', 8)} ${padR('CLK', 6)} ${padR('CTR', 7)} ${padR('POS', 6)}`);
  for (const p of pages.slice(0, 30)) {
    const path = p.keys[0].replace(/^https?:\/\/[^/]+/, '');
    console.log(
      `  ${pad(path, 70)} ${padR(p.impressions, 8)} ${padR(p.clicks, 6)} ${padR((p.ctr * 100).toFixed(1) + '%', 7)} ${padR(p.position.toFixed(1), 6)}`,
    );
  }
  console.log('');

  // ───── Top queries ─────
  console.log('═══ TOP QUERIES ═══');
  const queries = await querySC(['query'], 500);
  queries.sort((a, b) => b.impressions - a.impressions);
  console.log(`  Total unique queries: ${queries.length}\n`);
  console.log(`  ${pad('QUERY', 60)} ${padR('IMPR', 8)} ${padR('CLK', 6)} ${padR('CTR', 7)} ${padR('POS', 6)}`);
  for (const q of queries.slice(0, 30)) {
    console.log(
      `  ${pad(q.keys[0], 60)} ${padR(q.impressions, 8)} ${padR(q.clicks, 6)} ${padR((q.ctr * 100).toFixed(1) + '%', 7)} ${padR(q.position.toFixed(1), 6)}`,
    );
  }
  console.log('');

  // ───── Opportunities ─────
  console.log('═══ IMPROVEMENT OPPORTUNITIES ═══\n');

  // 1. Striking-distance queries (position 8-20, ≥10 impressions)
  const striking = queries
    .filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
  console.log(`▸ STRIKING DISTANCE — queries at position 8-20 (push to page 1):`);
  if (!striking.length) {
    console.log('  (none yet)');
  } else {
    for (const q of striking) {
      console.log(
        `  pos ${padR(q.position.toFixed(1), 5)}  impr ${padR(q.impressions, 5)}  clk ${padR(q.clicks, 4)}  "${q.keys[0]}"`,
      );
    }
  }
  console.log('');

  // 2. Underperforming CTR (page-level: position ≤ 10, CTR much lower than expected, ≥20 impressions)
  const underCtr = pages
    .filter((p) => p.position <= 10 && p.impressions >= 20)
    .map((p) => ({ ...p, expected: expectedCtrFor(p.position), gap: expectedCtrFor(p.position) - p.ctr }))
    .filter((p) => p.gap > 0.02)
    .sort((a, b) => b.gap * b.impressions - a.gap * a.impressions)
    .slice(0, 15);
  console.log(`▸ LOW CTR FOR POSITION — pages ranking on page 1 but underclicking (improve title/meta):`);
  if (!underCtr.length) {
    console.log('  (none — either no page-1 rankings yet or CTRs are healthy)');
  } else {
    for (const p of underCtr) {
      const path = p.keys[0].replace(/^https?:\/\/[^/]+/, '');
      console.log(
        `  pos ${padR(p.position.toFixed(1), 5)}  ctr ${padR((p.ctr * 100).toFixed(1) + '%', 6)} (expected ~${(p.expected * 100).toFixed(0)}%)  impr ${padR(p.impressions, 5)}  ${path}`,
      );
    }
  }
  console.log('');

  // 3. Impressions but zero clicks (≥30 impressions, 0 clicks) — title/snippet not compelling
  const zeroClicks = queries
    .filter((q) => q.clicks === 0 && q.impressions >= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
  console.log(`▸ IMPRESSIONS BUT ZERO CLICKS — queries you appear for but never get clicked:`);
  if (!zeroClicks.length) {
    console.log('  (none)');
  } else {
    for (const q of zeroClicks) {
      console.log(
        `  impr ${padR(q.impressions, 5)}  pos ${padR(q.position.toFixed(1), 5)}  "${q.keys[0]}"`,
      );
    }
  }
  console.log('');

  // 4. High-CTR queries on page 2-3 — strong intent match, just need ranking boost
  const goodCtrPage2 = queries
    .filter((q) => q.position > 10 && q.position <= 30 && q.ctr >= 0.05 && q.impressions >= 5)
    .sort((a, b) => b.ctr * b.impressions - a.ctr * a.impressions)
    .slice(0, 10);
  console.log(`▸ HIGH-INTENT QUERIES ON PAGE 2-3 — strong CTR despite low rank (build links/content):`);
  if (!goodCtrPage2.length) {
    console.log('  (none)');
  } else {
    for (const q of goodCtrPage2) {
      console.log(
        `  pos ${padR(q.position.toFixed(1), 5)}  ctr ${padR((q.ctr * 100).toFixed(1) + '%', 6)}  impr ${padR(q.impressions, 5)}  "${q.keys[0]}"`,
      );
    }
  }
  console.log('');

  // 5. Page-query summary: which pages have rich query coverage?
  const pageQueries = await querySC(['page', 'query'], 1000);
  const byPage = {};
  for (const r of pageQueries) {
    const p = r.keys[0];
    if (!byPage[p]) byPage[p] = { queries: 0, impressions: 0, clicks: 0 };
    byPage[p].queries++;
    byPage[p].impressions += r.impressions;
    byPage[p].clicks += r.clicks;
  }
  const pageStats = Object.entries(byPage)
    .map(([p, s]) => ({ page: p.replace(/^https?:\/\/[^/]+/, ''), ...s }))
    .sort((a, b) => b.queries - a.queries)
    .slice(0, 15);
  console.log(`▸ QUERY COVERAGE BY PAGE — pages ranking for the most distinct queries:`);
  console.log(`  ${pad('PAGE', 70)} ${padR('QUERIES', 8)} ${padR('IMPR', 8)} ${padR('CLK', 6)}`);
  for (const p of pageStats) {
    console.log(`  ${pad(p.page, 70)} ${padR(p.queries, 8)} ${padR(p.impressions, 8)} ${padR(p.clicks, 6)}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
