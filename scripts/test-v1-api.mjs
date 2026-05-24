// Phase 1A end-to-end test of the public /api/v1 surface.
//
// Usage:
//   node scripts/test-v1-api.mjs [base_url] [test_email] [scan_url]
//
// Defaults to the prod Cloud Function direct URL. Once the /api hosting
// rewrite is deployed, https://jackpotkeywords.web.app/api also works.
// For emulator: http://127.0.0.1:5001/even-plate-378520/us-central1/api/api
//
// What it does:
//   1. POST /v1/signup with a throwaway email
//   2. GET  /v1/me using the returned key
//   3. POST /v1/aeo-scan against a real URL (default: markitup.app)
//   4. GET  /v1/me again to confirm the $1.00 deduction
//
// Pass-criteria: signup returns key + 500 balance; me echoes that; aeo-scan
// returns a visibilityScore; final balance is 400 cents lower.

const BASE = process.argv[2] || 'https://us-central1-even-plate-378520.cloudfunctions.net/api/api';
const TEST_EMAIL = process.argv[3] || `v1-test-${Date.now()}@example.com`;
const SCAN_URL = process.argv[4] || 'https://markitup.app';

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
  console.log(`\n=== Phase 1A test ===\nBase: ${BASE}\nEmail: ${TEST_EMAIL}\nScan URL: ${SCAN_URL}\n`);

  console.log('[1/4] POST /v1/signup');
  const signup = await call('POST', '/v1/signup', { email: TEST_EMAIL });
  console.log(`  status ${signup.status}, body keys: ${Object.keys(signup.body).join(', ')}`);
  assert(signup.status === 200, 'signup returns 200');
  assert(typeof signup.body.apiKey === 'string' && signup.body.apiKey.startsWith('jk_live_'),
    'signup returns jk_live_ key');
  assert(signup.body.balanceCents === 500, 'new signup has 500 cent balance');
  const apiKey = signup.body.apiKey;
  console.log(`  apiKey: ${apiKey.slice(0, 16)}…`);

  console.log('\n[2/4] GET /v1/me');
  const me1 = await call('GET', '/v1/me', null, apiKey);
  console.log(`  status ${me1.status}, balanceCents=${me1.body.balanceCents}`);
  assert(me1.status === 200, '/v1/me returns 200');
  assert(me1.body.balanceCents === 500, '/v1/me shows 500 cent balance');
  assert(me1.body.email === TEST_EMAIL.toLowerCase(), 'email matches signup');

  console.log('\n[3/4] POST /v1/aeo-scan (this can take 30-60s)');
  const scanStart = Date.now();
  const scan = await call('POST', '/v1/aeo-scan', { url: SCAN_URL }, apiKey);
  const scanMs = Date.now() - scanStart;
  console.log(`  status ${scan.status}, ${scanMs}ms`);
  if (scan.status !== 200) {
    console.error('  body:', JSON.stringify(scan.body, null, 2));
  }
  assert(scan.status === 200, '/v1/aeo-scan returns 200');
  assert(typeof scan.body.visibilityScore === 'number', 'response has visibilityScore');
  assert(scan.body.balanceCents === 400, 'balance reflects $1.00 deduction (400 cents remaining)');
  console.log(`  visibilityScore: ${scan.body.visibilityScore}/100`);
  console.log(`  queriesCited: ${scan.body.queriesCited}/${scan.body.queriesChecked}`);

  console.log('\n[4/4] GET /v1/me again to confirm persistence');
  const me2 = await call('GET', '/v1/me', null, apiKey);
  assert(me2.body.balanceCents === 400, 'balance still 400 after scan');

  console.log('\n✅ Phase 1A test passed.\n');
})().catch((err) => {
  console.error('Test crashed:', err.message);
  process.exit(1);
});
