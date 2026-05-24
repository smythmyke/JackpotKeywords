// End-to-end test of the public /api/v1 surface (Phase 1A + 1B).
//
// Usage:
//   node scripts/test-v1-api.mjs [base_url] [test_email] [scan_url] [recommend_url]
//
// Defaults to the prod Cloud Function direct URL. Once the /api hosting
// rewrite is deployed, https://jackpotkeywords.web.app/api also works.
// For emulator: http://127.0.0.1:5001/even-plate-378520/us-central1/api/api
//
// What it does (in order, against a fresh test customer):
//   Phase 1A
//     1. POST /v1/signup            — create customer + $5 credit
//     2. GET  /v1/me                — confirm balance
//     3. POST /v1/aeo-scan          — $1.00 deduction
//     4. GET  /v1/me                — confirm 400 cents remain
//   Phase 1B
//     5. POST /v1/keys              — create a new named key
//     6. GET  /v1/keys              — list should include default + new key
//     7. DELETE /v1/keys/:keyId     — revoke the new key
//     8. POST /v1/recommend         — $0.10 deduction, returns ranked keywords
//     9. GET  /v1/me                — confirm 390 cents remain
//
// Pass-criteria: every step returns 200 and assertions pass. Final balance
// is 390 cents (500 - 100 aeo - 10 recommend).

const BASE = process.argv[2] || 'https://us-central1-even-plate-378520.cloudfunctions.net/api/api';
const TEST_EMAIL = process.argv[3] || `v1-test-${Date.now()}@example.com`;
const SCAN_URL = process.argv[4] || 'https://markitup.app';
const RECOMMEND_URL = process.argv[5] || 'https://markitup.app';

async function call(method, path, body, apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ❌ ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

(async () => {
  console.log(`\n=== /api/v1 test (1A + 1B) ===\nBase: ${BASE}\nEmail: ${TEST_EMAIL}\nScan URL: ${SCAN_URL}\nRecommend URL: ${RECOMMEND_URL}\n`);

  // ── Phase 1A ────────────────────────────────────────────────

  console.log('[1/9] POST /v1/signup');
  const signup = await call('POST', '/v1/signup', { email: TEST_EMAIL });
  console.log(`  status ${signup.status}, body keys: ${Object.keys(signup.body).join(', ')}`);
  assert(signup.status === 200, 'signup returns 200');
  assert(typeof signup.body.apiKey === 'string' && signup.body.apiKey.startsWith('jk_live_'),
    'signup returns jk_live_ key');
  assert(signup.body.balanceCents === 500, 'new signup has 500 cent balance');
  const apiKey = signup.body.apiKey;
  console.log(`  apiKey: ${apiKey.slice(0, 16)}…`);

  console.log('\n[2/9] GET /v1/me');
  const me1 = await call('GET', '/v1/me', null, apiKey);
  console.log(`  status ${me1.status}, balanceCents=${me1.body.balanceCents}`);
  assert(me1.status === 200, '/v1/me returns 200');
  assert(me1.body.balanceCents === 500, '/v1/me shows 500 cent balance');
  assert(me1.body.email === TEST_EMAIL.toLowerCase(), 'email matches signup');

  console.log('\n[3/9] POST /v1/aeo-scan (this can take 30-120s)');
  const scanStart = Date.now();
  const scan = await call('POST', '/v1/aeo-scan', { url: SCAN_URL }, apiKey);
  const scanMs = Date.now() - scanStart;
  console.log(`  status ${scan.status}, ${scanMs}ms`);
  if (scan.status !== 200) console.error('  body:', JSON.stringify(scan.body, null, 2));
  assert(scan.status === 200, '/v1/aeo-scan returns 200');
  assert(typeof scan.body.visibilityScore === 'number', 'response has visibilityScore');
  assert(scan.body.balanceCents === 400, 'balance reflects $1.00 deduction (400 cents remaining)');
  console.log(`  visibilityScore: ${scan.body.visibilityScore}/100`);
  console.log(`  queriesCited: ${scan.body.queriesCited}/${scan.body.queriesChecked}`);

  console.log('\n[4/9] GET /v1/me — confirm $1 deduction persisted');
  const me2 = await call('GET', '/v1/me', null, apiKey);
  assert(me2.body.balanceCents === 400, 'balance still 400 after scan');

  // ── Phase 1B ────────────────────────────────────────────────

  console.log('\n[5/9] POST /v1/keys — create a new named key');
  const newKey = await call('POST', '/v1/keys', { name: 'phase1b-test' }, apiKey);
  console.log(`  status ${newKey.status}, keyId=${newKey.body.keyId?.slice(0, 12)}…`);
  assert(newKey.status === 200, '/v1/keys POST returns 200');
  assert(typeof newKey.body.apiKey === 'string' && newKey.body.apiKey.startsWith('jk_live_'),
    'returns a new jk_live_ key');
  assert(newKey.body.name === 'phase1b-test', 'key name echoed back');
  assert(typeof newKey.body.keyId === 'string' && newKey.body.keyId.length === 64,
    'keyId is 64-char sha256');
  const newKeyId = newKey.body.keyId;
  const newRawKey = newKey.body.apiKey;

  console.log('\n[6/9] GET /v1/keys — list active keys');
  const listKeys = await call('GET', '/v1/keys', null, apiKey);
  console.log(`  status ${listKeys.status}, count=${listKeys.body.keys?.length}`);
  assert(listKeys.status === 200, '/v1/keys GET returns 200');
  assert(Array.isArray(listKeys.body.keys), 'returns keys array');
  assert(listKeys.body.keys.length >= 2, 'lists at least default + new key');
  const newKeyEntry = listKeys.body.keys.find((k) => k.keyId === newKeyId);
  assert(newKeyEntry && newKeyEntry.name === 'phase1b-test', 'new key appears in list');
  assert(typeof newKeyEntry.prefix === 'string' && newKeyEntry.prefix.startsWith('jk_live_'),
    'prefix is shown but truncated');

  // Verify the new key actually works
  console.log('\n[6.5/9] GET /v1/me via the new key');
  const meViaNew = await call('GET', '/v1/me', null, newRawKey);
  assert(meViaNew.status === 200, 'new key authenticates');
  assert(meViaNew.body.customerId === me1.body.customerId, 'new key belongs to same customer');

  console.log('\n[7/9] DELETE /v1/keys/:keyId — revoke the new key');
  const del = await call('DELETE', `/v1/keys/${newKeyId}`, null, apiKey);
  console.log(`  status ${del.status}`);
  assert(del.status === 200, '/v1/keys DELETE returns 200');
  assert(del.body.ok === true, 'revoke ok');
  // Revoked key should no longer authenticate
  const meViaRevoked = await call('GET', '/v1/me', null, newRawKey);
  assert(meViaRevoked.status === 401, 'revoked key returns 401');

  console.log('\n[8/9] POST /v1/recommend (this can take 60-180s)');
  const recStart = Date.now();
  const rec = await call('POST', '/v1/recommend', {
    url: RECOMMEND_URL,
    description: 'AI-powered keyword research tool for indie makers',
    limit: 25,
  }, apiKey);
  const recMs = Date.now() - recStart;
  console.log(`  status ${rec.status}, ${recMs}ms`);
  if (rec.status !== 200) console.error('  body:', JSON.stringify(rec.body, null, 2));
  assert(rec.status === 200, '/v1/recommend returns 200');
  assert(Array.isArray(rec.body.recommendations), 'returns recommendations array');
  assert(rec.body.recommendations.length > 0, 'returns at least one recommendation');
  assert(rec.body.recommendations.length <= 25, 'respects limit=25');
  assert(rec.body.balanceCents === 390, 'balance reflects $0.10 deduction (390 cents remaining)');
  const top = rec.body.recommendations[0];
  assert(typeof top.keyword === 'string', 'recommendation has keyword');
  assert(typeof top.jackpotScore === 'number', 'recommendation has jackpotScore');
  console.log(`  top keyword: "${top.keyword}" (vol=${top.monthlyVolume}, score=${top.jackpotScore?.toFixed?.(1) ?? top.jackpotScore})`);

  console.log('\n[9/9] GET /v1/me — confirm final balance');
  const me3 = await call('GET', '/v1/me', null, apiKey);
  assert(me3.body.balanceCents === 390, 'final balance 390 cents (500 - 100 aeo - 10 recommend)');

  console.log('\n✅ /api/v1 (1A + 1B) test passed.\n');
})().catch((err) => {
  console.error('Test crashed:', err.message);
  process.exit(1);
});
