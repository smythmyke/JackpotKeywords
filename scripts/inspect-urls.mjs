// Uses Search Console URL Inspection API to check indexing status of key pages.
// Usage: node scripts/inspect-urls.mjs
import { readFileSync } from 'fs';
import { google } from 'googleapis';

const SITE_URL = 'https://jackpotkeywords.web.app/';

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
const sc = google.searchconsole({ version: 'v1', auth: oauth2 });

const urls = [
  '/',
  '/pricing',
  '/blog',
  '/blog/what-is-keyword-research',
  '/blog/free-keyword-research-tool',
  '/blog/jackpotkeywords-vs-semrush',
  '/blog/best-keyword-research-tool-2026',
  '/seo-audit',
  '/features',
  '/contact',
];

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

async function inspect(path) {
  try {
    const res = await sc.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: SITE_URL.replace(/\/$/, '') + path,
        siteUrl: SITE_URL,
      },
    });
    const idx = res.data.inspectionResult?.indexStatusResult || {};
    const mob = res.data.inspectionResult?.mobileUsabilityResult || {};
    return {
      path,
      verdict: idx.verdict || '?',
      coverageState: idx.coverageState || '?',
      indexingState: idx.indexingState || '?',
      lastCrawl: idx.lastCrawlTime || 'never',
      sitemap: idx.sitemap?.length ? '✓' : '✗',
      referringUrls: idx.referringUrls?.length || 0,
      mobile: mob.verdict || '?',
    };
  } catch (err) {
    return { path, error: err.message.slice(0, 100) };
  }
}

async function main() {
  console.log(`\nURL Inspection for ${SITE_URL}\n`);
  console.log(
    `${pad('PATH', 50)} ${pad('VERDICT', 12)} ${pad('COVERAGE', 35)} ${pad('LAST CRAWL', 22)} ${pad('SITEMAP', 8)}`,
  );
  console.log('─'.repeat(135));

  for (const path of urls) {
    const r = await inspect(path);
    if (r.error) {
      console.log(`${pad(path, 50)} ERROR: ${r.error}`);
    } else {
      const crawl = r.lastCrawl === 'never' ? 'never' : new Date(r.lastCrawl).toISOString().slice(0, 16);
      console.log(
        `${pad(r.path, 50)} ${pad(r.verdict, 12)} ${pad(r.coverageState, 35)} ${pad(crawl, 22)} ${pad(r.sitemap, 8)}`,
      );
    }
    await new Promise((r) => setTimeout(r, 200)); // be polite
  }
  console.log('');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
