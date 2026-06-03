/**
 * IndexNow ping — instantly notify Bing / Yandex / Naver / Seznam / Yep of our
 * URLs so they crawl + index without waiting for sitemap discovery.
 *
 * Google does NOT use IndexNow (confirmed 2026), but Bing does — and Bing powers
 * ChatGPT Search, so this is the fastest path to being eligible for ChatGPT
 * citations. ~5B URLs/day flow through IndexNow; submitted URLs hit the crawl
 * queue in ~24h.
 *
 * Reads URLs from the sitemap (dist/ if built, else public/) and POSTs them to
 * api.indexnow.org. Run AFTER deploying (the key file must be live at the site
 * root for IndexNow to validate ownership):
 *
 *   npm run build && firebase deploy --only hosting
 *   npm run indexnow            # submit all sitemap URLs
 *   npm run indexnow -- --dry-run   # parse + print payload, submit nothing
 *
 * Setup: the key file public/e1a3cdeac1295499cfed1406f581ce3b.txt must deploy to
 * https://jackpotkeywords.web.app/e1a3cdeac1295499cfed1406f581ce3b.txt
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = 'jackpotkeywords.web.app';
const KEY = 'e1a3cdeac1295499cfed1406f581ce3b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const DRY_RUN = process.argv.includes('--dry-run');

function findSitemap() {
  const candidates = [
    path.resolve(__dirname, '../dist/sitemap.xml'),
    path.resolve(__dirname, '../public/sitemap.xml'),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error('sitemap.xml not found in dist/ or public/');
}

function extractUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const sitemapPath = findSitemap();
  const xml = fs.readFileSync(sitemapPath, 'utf-8');
  const urlList = extractUrls(xml);

  if (urlList.length === 0) throw new Error(`No <loc> URLs found in ${sitemapPath}`);
  if (urlList.length > 10000) throw new Error('IndexNow accepts max 10,000 URLs per request');

  const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };

  console.log(`IndexNow: ${urlList.length} URLs from ${path.basename(path.dirname(sitemapPath))}/sitemap.xml`);
  console.log(`keyLocation: ${KEY_LOCATION}`);

  if (DRY_RUN) {
    console.log('\n--dry-run — not submitting. Payload:');
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  // IndexNow: 200 = OK, 202 = accepted/pending verification, 403 = key not
  // valid (is the key file deployed?), 422 = URLs don't match host/key.
  const text = await res.text().catch(() => '');
  if (res.status === 200 || res.status === 202) {
    console.log(`\n✅ Submitted (${res.status}). Bing/Yandex/etc. will crawl shortly.`);
  } else {
    console.error(`\n❌ ${res.status} ${res.statusText}. ${text}`);
    if (res.status === 403) console.error(`   → Is ${KEY_LOCATION} live? Deploy hosting first.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('IndexNow ping failed:', err.message);
  process.exit(1);
});
