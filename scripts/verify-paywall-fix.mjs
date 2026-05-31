// Live verification of the paywall fix on GET /api/search/:id and /api/audit/:id.
//
// Validates BOTH directions:
//   1. A free (non-admin, non-subscriber) user fetching a global search/audit
//      gets a MASKED payload with paid:false  (the loophole is closed).
//   2. The same user, elevated to plan:'pro', gets the UNMASKED payload with
//      paid:true  (legitimate paying users are unaffected).
//
// Self-contained: creates its own user + fixtures and cleans them up.
// Run:  GOOGLE_CLOUD_PROJECT=even-plate-378520 GCLOUD_PROJECT=even-plate-378520 node scripts/verify-paywall-fix.mjs

import admin from 'firebase-admin';

const PROJECT = 'even-plate-378520';
const HOST = 'https://jackpotkeywords.web.app';
const TEST_ID = '__loophole_test__';

admin.initializeApp({ projectId: PROJECT });
const db = admin.firestore();
const auth = admin.auth();

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

async function getWebApiKey() {
  const res = await fetch(`${HOST}/__/firebase/init.json`);
  if (!res.ok) throw new Error(`init.json ${res.status}`);
  const cfg = await res.json();
  if (!cfg.apiKey) throw new Error('no apiKey in init.json');
  return cfg.apiKey;
}

// Returns { idToken, uid } for a fresh free user. Tries the auth strategies the
// project is most likely to allow, in order, and reports which one worked.
async function makeFreeUser(apiKey) {
  // Strategy 1: anonymous sign-up via Identity Toolkit REST.
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    });
    const j = await r.json();
    if (r.ok && j.idToken) { console.log('auth: anonymous signUp'); return { idToken: j.idToken, uid: j.localId }; }
    console.log(`auth: anonymous signUp unavailable (${j.error?.message || r.status})`);
  } catch (e) { console.log(`auth: anonymous signUp threw (${e.message})`); }

  // Strategy 2: admin custom token -> exchange for ID token.
  try {
    const uid = `loophole-test-${Date.now()}`;
    const customToken = await auth.createCustomToken(uid);
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });
    const j = await r.json();
    if (r.ok && j.idToken) { console.log('auth: custom token'); return { idToken: j.idToken, uid: j.localId || uid }; }
    console.log(`auth: custom token exchange failed (${j.error?.message || r.status})`);
  } catch (e) { console.log(`auth: custom token threw (${e.message})`); }

  // Strategy 3: email/password user via admin + REST password sign-in.
  const email = `loophole-test-${Date.now()}@example.com`;
  const password = `Pw!${Date.now()}aA`;
  const created = await auth.createUser({ email, password });
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await r.json();
  if (r.ok && j.idToken) { console.log('auth: email/password'); return { idToken: j.idToken, uid: created.uid }; }
  throw new Error(`all auth strategies failed; last: ${j.error?.message || r.status}`);
}

function makeSearchFixture() {
  const keywords = [];
  for (let i = 0; i < 30; i++) {
    keywords.push({
      keyword: `kw-${i}`,
      jackpotScore: 100 - i,      // kw-0 is the top "goldmine" => must be masked for free
      jackpotScore_v2: 100 - i,
      monthlyVolume: 1000 - i * 10,
      cpc: 1.5,
      competition: 'LOW',
      intent: 'commercial',
      source: 'test',
    });
  }
  return { query: 'loophole test', productLabel: 'test', mode: 'concept', paid: false, keywords, clusters: [], metadata: { totalKeywords: 30 }, createdAt: admin.firestore.FieldValue.serverTimestamp() };
}

function makeAuditFixture() {
  return {
    url: 'https://example.com', paid: false, overallScore: 70,
    checks: [
      { id: 'title', label: 'Title', status: 'pass', recommendation: 'Keep the great title' },
      { id: 'meta', label: 'Meta', status: 'warning', recommendation: 'Add a meta description' },
      { id: 'h1', label: 'H1', status: 'fail', recommendation: 'Add an H1 tag' },
    ],
    keywordGaps: [
      { keyword: 'gap one', opportunity: 'high', difficulty: 'low', sampleKeywords: [] },
      { keyword: 'gap two', opportunity: 'mid', difficulty: 'low', sampleKeywords: [] },
      { keyword: 'gap three SECRET', opportunity: 'high', difficulty: 'mid', sampleKeywords: [] },
      { keyword: 'gap four SECRET', opportunity: 'high', difficulty: 'mid', sampleKeywords: [] },
    ],
    metadata: { pagesAnalyzed: 1 }, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function getJson(path, idToken) {
  const r = await fetch(`${HOST}${path}`, { headers: { Authorization: `Bearer ${idToken}` } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}

async function main() {
  const apiKey = await getWebApiKey();
  const { idToken, uid } = await makeFreeUser(apiKey);
  console.log(`test uid: ${uid}\n`);

  // Seed global fixtures the GET handlers will fall back to.
  await db.doc(`searches/${TEST_ID}`).set(makeSearchFixture());
  await db.doc(`audits/${TEST_ID}`).set(makeAuditFixture());
  // Ensure the caller starts as a clean free user.
  await db.doc(`users/${uid}`).set({ plan: 'free', email: '' }, { merge: true }).catch(() => {});

  try {
    // ---- 1. FREE user must be blocked ----
    const fs = await getJson(`/api/search/${TEST_ID}`, idToken);
    const searchMasked = JSON.stringify(fs.body?.keywords || []).includes('••• locked');
    const topHidden = !JSON.stringify(fs.body?.keywords || []).includes('"kw-0"');
    record('search GET: free user gets paid:false', fs.status === 200 && fs.body?.paid === false, `status=${fs.status} paid=${fs.body?.paid}`);
    record('search GET: free user keywords masked', searchMasked && topHidden, `masked=${searchMasked} topGoldmineHidden=${topHidden}`);

    const fa = await getJson(`/api/audit/${TEST_ID}`, idToken);
    const recMasked = JSON.stringify(fa.body?.checks || []).toLowerCase().includes('sign in to see');
    const gapMasked = JSON.stringify(fa.body?.keywordGaps || []).toLowerCase().includes('sign in to see');
    record('audit GET: free user gets paid:false', fa.status === 200 && fa.body?.paid === false, `status=${fa.status} paid=${fa.body?.paid}`);
    record('audit GET: free user content masked', recMasked || gapMasked, `recMasked=${recMasked} gapMasked=${gapMasked}`);

    // Confirm the audit fallback did NOT grant paid:true in the user's copy.
    const copied = await db.doc(`users/${uid}/audits/${TEST_ID}`).get();
    record('audit fallback copy is not paid:true', !copied.exists || copied.data()?.paid !== true, `exists=${copied.exists} paid=${copied.exists ? copied.data()?.paid : 'n/a'}`);

    // ---- 2. PAID user must still get full data ----
    await db.doc(`users/${uid}`).set({ plan: 'pro', email: '' }, { merge: true });
    const ps = await getJson(`/api/search/${TEST_ID}`, idToken);
    const searchUnmasked = !JSON.stringify(ps.body?.keywords || []).includes('••• locked') && JSON.stringify(ps.body?.keywords || []).includes('"kw-0"');
    record('search GET: pro user gets paid:true + unmasked', ps.status === 200 && ps.body?.paid === true && searchUnmasked, `status=${ps.status} paid=${ps.body?.paid} unmasked=${searchUnmasked}`);

    const pa = await getJson(`/api/audit/${TEST_ID}`, idToken);
    const auditUnmasked = !JSON.stringify(pa.body?.checks || []).toLowerCase().includes('sign in to see');
    record('audit GET: pro user gets paid:true + unmasked', pa.status === 200 && pa.body?.paid === true && auditUnmasked, `status=${pa.status} paid=${pa.body?.paid} unmasked=${auditUnmasked}`);
  } finally {
    // Cleanup
    await db.doc(`searches/${TEST_ID}`).delete().catch(() => {});
    await db.doc(`audits/${TEST_ID}`).delete().catch(() => {});
    await db.doc(`users/${uid}/audits/${TEST_ID}`).delete().catch(() => {});
    await db.doc(`users/${uid}/searches/${TEST_ID}`).delete().catch(() => {});
    await db.doc(`users/${uid}`).delete().catch(() => {});
    await auth.deleteUser(uid).catch(() => {});
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${'='.repeat(48)}`);
  console.log(failed.length === 0 ? `ALL ${results.length} CHECKS PASSED — loophole closed, paid path intact.` : `${failed.length}/${results.length} CHECKS FAILED: ${failed.map((f) => f.name).join('; ')}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('VERIFY SCRIPT ERROR:', e.message); process.exit(2); });
