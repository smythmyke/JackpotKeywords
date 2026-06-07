// Pulls search-related activity events and prints what users actually typed.
// Shows query length distribution, URL presence, inputType, and lists every
// real search/audit input so we can spot quality issues.
// Usage: node scripts/analyze-search-inputs.mjs [limit]
import admin from 'firebase-admin';

const PROJECT_ID = 'even-plate-378520';
const LIMIT = Number(process.argv[2]) || 3000;
const ADMIN_EMAILS = new Set(['smythmyke@gmail.com']);

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function bucket(n) {
  if (n === 0) return '0';
  if (n < 10) return '1-9';
  if (n < 25) return '10-24';
  if (n < 50) return '25-49';
  if (n < 100) return '50-99';
  if (n < 200) return '100-199';
  if (n < 500) return '200-499';
  return '500+';
}

async function main() {
  console.log(`Pulling last ${LIMIT} activityLog events from ${PROJECT_ID}...`);
  const [logsSnap, usersSnap] = await Promise.all([
    db.collection('activityLog').orderBy('timestamp', 'desc').limit(LIMIT).get(),
    db.collection('users').get(),
  ]);

  const adminUids = new Set();
  usersSnap.forEach((doc) => {
    const d = doc.data();
    if (d.email && ADMIN_EMAILS.has(d.email)) adminUids.add(doc.id);
  });

  const logs = [];
  logsSnap.forEach((doc) => logs.push({ id: doc.id, ...doc.data() }));
  const filtered = logs.filter((l) => {
    if (l.userId && adminUids.has(l.userId)) return false;
    if (l.email && ADMIN_EMAILS.has(l.email)) return false;
    return true;
  });

  const searchActions = new Set(['search', 'seo_audit', 'audit_keyword_preview']);
  const events = filtered.filter((l) => searchActions.has(l.action));
  console.log(`Input-bearing events (search, seo_audit, audit_keyword_preview): ${events.length}`);
  console.log('');

  // Length buckets (by char count) per action
  const byAction = {};
  events.forEach((l) => {
    const action = l.action;
    const query = l.query || l.url || '';
    byAction[action] ||= { count: 0, charBuckets: {}, wordBuckets: {}, withUrl: 0, withDesc: 0, both: 0, neither: 0 };
    const rec = byAction[action];
    rec.count++;
    const charLen = (l.query || '').length;
    const wordLen = (l.query || '').trim() ? (l.query || '').trim().split(/\s+/).length : 0;
    rec.charBuckets[bucket(charLen)] = (rec.charBuckets[bucket(charLen)] || 0) + 1;
    rec.wordBuckets[bucket(wordLen)] = (rec.wordBuckets[bucket(wordLen)] || 0) + 1;
    const hasDesc = !!(l.query && l.query.trim());
    const hasUrl = !!(l.url && l.url.trim());
    if (hasDesc && hasUrl) rec.both++;
    else if (hasUrl) rec.withUrl++;
    else if (hasDesc) rec.withDesc++;
    else rec.neither++;
  });

  for (const [action, rec] of Object.entries(byAction)) {
    console.log(`=== ${action} (n=${rec.count}) ===`);
    console.log(`  input mix: desc-only=${rec.withDesc}, url-only=${rec.withUrl}, both=${rec.both}, neither=${rec.neither}`);
    console.log(`  query char-length buckets:`);
    Object.entries(rec.charBuckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([b, c]) => console.log(`    ${b.padEnd(10)} ${c}`));
    console.log(`  query word-count buckets:`);
    Object.entries(rec.wordBuckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([b, c]) => console.log(`    ${b.padEnd(10)} ${c}`));
    console.log('');
  }

  // Dump actual inputs (most recent first), truncated
  console.log('=== Every input (newest first) ===');
  events.forEach((l) => {
    const ts = fmtDate(l.timestamp);
    const who = l.userId && l.userId !== 'anonymous' ? `user:${l.userId.slice(0, 8)}` : `anon:${(l.anonId || '').slice(0, 8)}`;
    const q = (l.query || '').replace(/\s+/g, ' ').slice(0, 200);
    const u = (l.url || '').slice(0, 120);
    const charLen = (l.query || '').length;
    const wordLen = (l.query || '').trim() ? (l.query || '').trim().split(/\s+/).length : 0;
    console.log(`[${ts}] ${l.action.padEnd(22)} ${who.padEnd(15)} chars=${String(charLen).padStart(3)} words=${String(wordLen).padStart(3)}`);
    if (q) console.log(`   q: ${q}`);
    if (u) console.log(`   u: ${u}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
