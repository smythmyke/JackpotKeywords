// Lists all Search Console properties the configured OAuth credential can access.
// Usage: node scripts/list-gsc-sites.mjs
import { readFileSync } from 'fs';
import { google } from 'googleapis';

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

const res = await wm.sites.list();
const sites = res.data.siteEntry || [];
if (!sites.length) {
  console.log('(no sites accessible with these credentials)');
  process.exit(0);
}
console.log(`Accessible Search Console properties (${sites.length}):\n`);
for (const s of sites) {
  console.log(`  ${s.permissionLevel.padEnd(16)} ${s.siteUrl}`);
}
