// Per-endpoint stats for the public /v1 API.
// Pulls the last N apiCalls + all apiCustomers from prod Firestore and prints
// counts, latency percentiles, error rate, and revenue grouped by endpoint
// and by customer. Run during the design-partner beta to see what partners
// actually hit, how slow it was, and what failed.
//
// Usage: node scripts/analyze-api-usage.mjs [limit]
// Env:   GOOGLE_CLOUD_PROJECT=even-plate-378520
//        GCLOUD_PROJECT=even-plate-378520
import admin from 'firebase-admin';

const PROJECT_ID = 'even-plate-378520';
const LIMIT = Number(process.argv[2]) || 1000;

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtCents(c) {
  return `$${(c / 100).toFixed(2)}`;
}

async function main() {
  console.log(`\nPulling last ${LIMIT} apiCalls + all apiCustomers from ${PROJECT_ID}...\n`);

  const [callsSnap, customersSnap, txSnap] = await Promise.all([
    db.collection('apiCalls').orderBy('timestamp', 'desc').limit(LIMIT).get(),
    db.collection('apiCustomers').get(),
    db.collection('apiTransactions').orderBy('timestamp', 'desc').limit(500).get(),
  ]);

  const customers = {};
  customersSnap.forEach((doc) => {
    customers[doc.id] = { id: doc.id, ...doc.data() };
  });

  const calls = [];
  callsSnap.forEach((doc) => calls.push({ id: doc.id, ...doc.data() }));

  if (calls.length === 0) {
    console.log('No apiCalls yet — partners haven\'t made any requests.\n');
    return;
  }

  const oldest = calls[calls.length - 1];
  const newest = calls[0];
  console.log(`Time range: ${fmtDate(oldest.timestamp)} → ${fmtDate(newest.timestamp)}`);
  console.log(`Calls in window: ${calls.length}\n`);

  // ── By endpoint ────────────────────────────────────────────────
  const byEndpoint = {};
  for (const c of calls) {
    const e = c.endpoint || 'unknown';
    if (!byEndpoint[e]) {
      byEndpoint[e] = { count: 0, ok: 0, errs: 0, latencies: [], revenueCents: 0, refunded: 0, errCodes: {} };
    }
    const b = byEndpoint[e];
    b.count++;
    if (c.ok === false) {
      b.errs++;
      const code = c.errCode || 'unknown';
      b.errCodes[code] = (b.errCodes[code] || 0) + 1;
      if (c.refunded) b.refunded++;
    } else {
      b.ok++;
      b.revenueCents += c.costCents || 0;
    }
    if (typeof c.latencyMs === 'number') b.latencies.push(c.latencyMs);
  }

  console.log('=== Per endpoint ===\n');
  for (const [endpoint, b] of Object.entries(byEndpoint)) {
    const sorted = [...b.latencies].sort((a, z) => a - z);
    const errRate = b.count ? (b.errs / b.count) * 100 : 0;
    console.log(`${endpoint}`);
    console.log(`  calls:      ${b.count}  (ok=${b.ok}, err=${b.errs}, refunded=${b.refunded})`);
    console.log(`  error rate: ${errRate.toFixed(1)}%`);
    console.log(`  revenue:    ${fmtCents(b.revenueCents)}  (net of refunds)`);
    if (sorted.length > 0) {
      console.log(`  latency:    p50=${fmtMs(percentile(sorted, 0.5))}  p90=${fmtMs(percentile(sorted, 0.9))}  p99=${fmtMs(percentile(sorted, 0.99))}  max=${fmtMs(sorted[sorted.length - 1])}`);
    } else {
      console.log(`  latency:    no samples (older calls predate latency tracking)`);
    }
    if (b.errs > 0) {
      const codes = Object.entries(b.errCodes)
        .sort((a, z) => z[1] - a[1])
        .map(([c, n]) => `${c}=${n}`)
        .join(', ');
      console.log(`  err codes:  ${codes}`);
    }
    console.log('');
  }

  // ── By customer ────────────────────────────────────────────────
  const byCustomer = {};
  for (const c of calls) {
    const id = c.customerId || 'unknown';
    if (!byCustomer[id]) {
      byCustomer[id] = { count: 0, ok: 0, errs: 0, revenueCents: 0, endpoints: {} };
    }
    const b = byCustomer[id];
    b.count++;
    if (c.ok === false) b.errs++;
    else {
      b.ok++;
      b.revenueCents += c.costCents || 0;
    }
    b.endpoints[c.endpoint] = (b.endpoints[c.endpoint] || 0) + 1;
  }

  console.log('=== Per customer ===\n');
  const sortedCustomers = Object.entries(byCustomer)
    .sort((a, z) => z[1].count - a[1].count);
  for (const [id, b] of sortedCustomers) {
    const cust = customers[id];
    const email = cust?.email || '(unknown customer)';
    const balance = cust ? fmtCents(cust.balanceCents) : '?';
    const lifetime = cust ? fmtCents(cust.lifetimeDepositedCents || 0) : '?';
    console.log(`${email}  (${id.slice(0, 12)}…)`);
    console.log(`  calls:    ${b.count}  (ok=${b.ok}, err=${b.errs})`);
    console.log(`  spent:    ${fmtCents(b.revenueCents)}  · balance: ${balance}  · lifetime topped up: ${lifetime}`);
    const endpoints = Object.entries(b.endpoints)
      .sort((a, z) => z[1] - a[1])
      .map(([e, n]) => `${e}=${n}`)
      .join(', ');
    console.log(`  by endpoint: ${endpoints}`);
    console.log('');
  }

  // ── Recent transactions (signups / topups / refunds) ──────────
  console.log('=== Recent transactions ===\n');
  const txs = [];
  txSnap.forEach((doc) => txs.push(doc.data()));
  const recent = txs.slice(0, 15);
  for (const tx of recent) {
    const cust = customers[tx.customerId];
    const email = cust?.email || '(unknown)';
    console.log(`  ${fmtDate(tx.timestamp)}  ${tx.type.padEnd(15)} ${fmtCents(tx.amountCents).padEnd(8)} ${email}`);
  }

  // ── Totals ────────────────────────────────────────────────────
  const totalCalls = calls.length;
  const totalErrs = calls.filter((c) => c.ok === false).length;
  const totalRevenue = calls.reduce((sum, c) => sum + (c.ok === false ? 0 : c.costCents || 0), 0);
  const totalCustomers = Object.keys(byCustomer).length;
  console.log('\n=== Totals (in window) ===');
  console.log(`  customers active:  ${totalCustomers}`);
  console.log(`  calls:             ${totalCalls}`);
  console.log(`  error rate:        ${totalCalls ? ((totalErrs / totalCalls) * 100).toFixed(1) : 0}%`);
  console.log(`  revenue:           ${fmtCents(totalRevenue)}`);
  console.log('');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
