// Pulls the last 2000 activityLog events from production Firestore and
// prints an aggregation summary: action counts, funnel, and recent timeline.
// Usage: node scripts/analyze-activity.mjs [limit]
import admin from 'firebase-admin';

const PROJECT_ID = 'even-plate-378520';
const LIMIT = Number(process.argv[2]) || 2000;
const ADMIN_EMAILS = new Set(['smythmyke@gmail.com']);

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

async function main() {
  console.log(`Pulling last ${LIMIT} activityLog events from ${PROJECT_ID}...`);
  const [logsSnap, usersSnap] = await Promise.all([
    db.collection('activityLog').orderBy('timestamp', 'desc').limit(LIMIT).get(),
    db.collection('users').get(),
  ]);

  const adminUids = new Set();
  const users = {};
  usersSnap.forEach((doc) => {
    const d = doc.data();
    users[doc.id] = d;
    if (d.email && ADMIN_EMAILS.has(d.email)) adminUids.add(doc.id);
  });

  const logs = [];
  logsSnap.forEach((doc) => logs.push(doc.data()));
  // Filter out admin activity
  const filtered = logs.filter((l) => {
    if (l.userId && adminUids.has(l.userId)) return false;
    if (l.email && ADMIN_EMAILS.has(l.email)) return false;
    return true;
  });

  console.log(`Total events: ${logs.length}, after excluding admin: ${filtered.length}`);
  if (!filtered.length) return;

  const firstTs = filtered[filtered.length - 1].timestamp;
  const lastTs = filtered[0].timestamp;
  console.log(`Date range: ${fmtDate(firstTs)} -> ${fmtDate(lastTs)}`);
  console.log('');

  // Action counts
  const actionCounts = {};
  filtered.forEach((l) => {
    actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
  });
  console.log('=== Action counts ===');
  Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([a, c]) => console.log(`  ${a.padEnd(28)} ${c}`));
  console.log('');

  // Unique visitors (by anonId or userId)
  const anonIds = new Set();
  const userIds = new Set();
  filtered.forEach((l) => {
    if (l.anonId) anonIds.add(l.anonId);
    if (l.userId && l.userId !== 'anonymous') userIds.add(l.userId);
  });
  console.log(`Unique anon sessions: ${anonIds.size}`);
  console.log(`Unique authed users: ${userIds.size}`);
  console.log('');

  // Funnel: search -> paywall_viewed -> signin_prompted -> signin_completed -> upgrade_clicked -> checkout_started
  const funnelCounts = {
    search: actionCounts.search || 0,
    paywall_viewed: actionCounts.paywall_viewed || 0,
    signin_prompted: actionCounts.signin_prompted || 0,
    signin_completed: actionCounts.signin_completed || 0,
    upgrade_clicked: actionCounts.upgrade_clicked || 0,
    checkout_started: actionCounts.checkout_started || 0,
  };
  console.log('=== Funnel (raw counts, not per-user) ===');
  Object.entries(funnelCounts).forEach(([k, v]) => console.log(`  ${k.padEnd(28)} ${v}`));
  console.log('');

  // Paywall sources (where paywall_viewed fired)
  const paywallSources = {};
  filtered
    .filter((l) => l.action === 'paywall_viewed')
    .forEach((l) => {
      const s = l.source || 'unknown';
      paywallSources[s] = (paywallSources[s] || 0) + 1;
    });
  if (Object.keys(paywallSources).length) {
    console.log('=== paywall_viewed sources ===');
    Object.entries(paywallSources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([s, c]) => console.log(`  ${s.padEnd(28)} ${c}`));
    console.log('');
  }

  // upgrade_clicked sources
  const upgradeSources = {};
  filtered
    .filter((l) => l.action === 'upgrade_clicked')
    .forEach((l) => {
      const s = l.source || l.kind || 'unknown';
      upgradeSources[s] = (upgradeSources[s] || 0) + 1;
    });
  if (Object.keys(upgradeSources).length) {
    console.log('=== upgrade_clicked sources ===');
    Object.entries(upgradeSources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([s, c]) => console.log(`  ${s.padEnd(28)} ${c}`));
    console.log('');
  }

  // Checkout kinds
  const checkoutKinds = {};
  filtered
    .filter((l) => l.action === 'checkout_started')
    .forEach((l) => {
      const k = `${l.kind || '?'}:${l.id || '?'}`;
      checkoutKinds[k] = (checkoutKinds[k] || 0) + 1;
    });
  if (Object.keys(checkoutKinds).length) {
    console.log('=== checkout_started by pack/plan ===');
    Object.entries(checkoutKinds)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, c]) => console.log(`  ${k.padEnd(28)} ${c}`));
    console.log('');
  }

  // Search errors
  const searchErrors = filtered.filter((l) => l.action === 'search_error');
  if (searchErrors.length) {
    const stepCounts = {};
    searchErrors.forEach((l) => {
      const s = l.pipelineStep || 'unknown';
      stepCounts[s] = (stepCounts[s] || 0) + 1;
    });
    console.log('=== search_error pipeline step ===');
    Object.entries(stepCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([s, c]) => console.log(`  ${s.padEnd(28)} ${c}`));
    console.log('');
  }

  // Per-session journey sample — for up to 10 most recent anon sessions, list actions
  const sessions = {};
  filtered.forEach((l) => {
    const key = l.anonId || l.userId || 'unknown';
    if (!sessions[key]) sessions[key] = [];
    sessions[key].push(l);
  });
  const sessionKeys = Object.keys(sessions)
    .map((k) => ({
      key: k,
      count: sessions[k].length,
      last: sessions[k][0].timestamp,
    }))
    .filter((s) => s.count >= 2)
    .sort((a, b) => (b.last?.toMillis?.() || 0) - (a.last?.toMillis?.() || 0))
    .slice(0, 15);
  console.log('=== Recent sessions (>=2 events) ===');
  sessionKeys.forEach(({ key, count }) => {
    const events = sessions[key]
      .slice()
      .reverse()
      .map((l) => {
        const tail = l.paid !== undefined ? ` paid=${l.paid}` : '';
        const kw = l.keywordCount ? ` kw=${l.keywordCount}` : '';
        const src = l.source ? ` src=${l.source}` : '';
        return `${l.action}${tail}${kw}${src}`;
      });
    console.log(`  ${key.slice(0, 10)}.. (${count}): ${events.join(' -> ')}`);
  });
  console.log('');

  // Input types on search
  const inputTypes = {};
  filtered
    .filter((l) => l.action === 'search')
    .forEach((l) => {
      const t = l.inputType || 'unknown';
      inputTypes[t] = (inputTypes[t] || 0) + 1;
    });
  if (Object.keys(inputTypes).length) {
    console.log('=== search inputType ===');
    Object.entries(inputTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([t, c]) => console.log(`  ${t.padEnd(28)} ${c}`));
    console.log('');
  }

  // Paid vs unpaid searches
  const searchLogs = filtered.filter((l) => l.action === 'search');
  const paid = searchLogs.filter((l) => l.paid === true).length;
  const unpaid = searchLogs.filter((l) => l.paid === false).length;
  console.log(`Searches: total=${searchLogs.length}, paid=${paid}, unpaid=${unpaid}`);

  // Save events
  const saves = filtered.filter((l) => l.action === 'save').length;
  const claims = filtered.filter((l) => l.action === 'claim').length;
  console.log(`Saves: ${saves}, claims: ${claims}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
