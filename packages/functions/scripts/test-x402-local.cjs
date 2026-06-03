/**
 * Local validation harness for the x402 agent-payments spike (roadmap X402-1a).
 * Mirrors scripts/test-mcp-local.cjs. Throwaway dev tool — not part of the
 * deploy. Run after `npm run build`:
 *
 *   node scripts/test-x402-local.cjs           # offline checks only (default)
 *   node scripts/test-x402-local.cjs --live     # + real Stripe sandbox round-trip
 *
 * OFFLINE (default, no network): exercises the pure logic in services/x402.ts
 * (flag/price helpers, X-PAYMENT proof parsing, challenge-body shape) and the
 * HTTP contract of the route (flag-off → 404, flag-on + bad input → 400). These
 * never reach Stripe or settle a payment, so they run anywhere.
 *
 * LIVE (--live): drives the actual Stripe preview crypto surface end-to-end —
 * createCryptoPaymentIntent → simulate_crypto_deposit (sandbox test helper) →
 * verifyPayment → refundPayment. This is the real X402-1a acceptance test and
 * REQUIRES:
 *   - STRIPE_SECRET_KEY set to a SANDBOX key (never live)
 *   - the "Stablecoins and Crypto" payment method approved on that account
 * It deliberately does NOT run the recommend pipeline (no Gemini/Ads keys, ~50s)
 * — that path is covered elsewhere; here we isolate the preview Stripe surface,
 * which is the part the spike is least sure about.
 */
const LIVE = process.argv.includes('--live');

// admin.firestore() runs at module-load inside services/x402.ts, so the default
// app must exist before we require it. No network call — the handle is lazy.
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-jk-x402-test' });

const express = require('express');
const http = require('http');
const https = require('https');

const x402 = require('../lib/services/x402');

let failures = 0;
function check(label, cond, detail) {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failures++;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
}
function skip(label, reason) {
  console.log(`  [SKIP] ${label}${reason ? ` — ${reason}` : ''}`);
}

// ── 1. Pure helpers (flag + price) ──────────────────────────────────────────
function offlineUnitChecks() {
  console.log('\nUnit: flag + price helpers');
  delete process.env.JK_X402_ENABLED;
  check('isX402Enabled() false when unset', x402.isX402Enabled() === false);
  process.env.JK_X402_ENABLED = '1';
  check("isX402Enabled() true for '1'", x402.isX402Enabled() === true);
  process.env.JK_X402_ENABLED = 'true';
  check("isX402Enabled() true for 'true'", x402.isX402Enabled() === true);
  process.env.JK_X402_ENABLED = '0';
  check("isX402Enabled() false for '0'", x402.isX402Enabled() === false);

  delete process.env.JK_X402_PRICE_CENTS;
  check('getX402PriceCents() defaults to 30 (recommend-deep)', x402.getX402PriceCents() === 30,
    `got ${x402.getX402PriceCents()}`);
  process.env.JK_X402_PRICE_CENTS = '15';
  check('getX402PriceCents() honors override (15)', x402.getX402PriceCents() === 15);
  process.env.JK_X402_PRICE_CENTS = 'garbage';
  check('getX402PriceCents() ignores non-numeric override', x402.getX402PriceCents() === 30);
  delete process.env.JK_X402_PRICE_CENTS;

  console.log('\nUnit: X-PAYMENT proof parsing');
  const raw = x402.extractPaymentProof({ headers: { 'x-payment': 'pi_abc123' } });
  check('parses raw pi_ header', raw && raw.paymentIntentId === 'pi_abc123');
  const b64 = Buffer.from(JSON.stringify({ paymentIntentId: 'pi_b64xyz' })).toString('base64');
  const decoded = x402.extractPaymentProof({ headers: { 'x-payment': b64 } });
  check('parses base64 JSON header', decoded && decoded.paymentIntentId === 'pi_b64xyz');
  check('absent header → null', x402.extractPaymentProof({ headers: {} }) === null);
  check('garbage header → null', x402.extractPaymentProof({ headers: { 'x-payment': 'not-a-payment' } }) === null);

  console.log('\nUnit: challenge body shape');
  const challenge = { paymentIntentId: 'pi_ch', payTo: '0xDEADBEEF', amountCents: 30, network: 'eip155:8453', asset: 'USDC' };
  const body = x402.buildChallengeBody(challenge, 'https://x/v1/x402/recommend');
  const accept = body && body.accepts && body.accepts[0];
  check('x402Version present', body.x402Version === 1);
  check('accepts[0].payTo carries deposit address', accept && accept.payTo === '0xDEADBEEF');
  check('accepts[0].price formatted $0.30', accept && accept.price === '$0.30', accept && accept.price);
  check('accepts[0].extra.paymentId bridges the PI id', accept && accept.extra && accept.extra.paymentId === 'pi_ch');
  check('accepts[0].network is Base', accept && accept.network === 'eip155:8453');
}

// ── 2. HTTP contract (mounts the real v1 router) ────────────────────────────
function rpc(port, body, headers = {}) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body || {});
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/v1/x402/recommend', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }));
      },
    );
    req.on('error', () => resolve({ status: 0, body: null }));
    req.write(data);
    req.end();
  });
}

async function httpContractChecks() {
  console.log('\nHTTP: route contract');
  let v1Router;
  try {
    v1Router = require('../lib/api/v1').default;
  } catch (err) {
    skip('mount v1 router', `import failed (${err.message}) — run "npm run build" first`);
    return;
  }
  const app = express();
  app.use(express.json());
  app.use('/api/v1', v1Router);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = server.address().port;

  // Flag OFF → 404 regardless of input (prod-safe default).
  delete process.env.JK_X402_ENABLED;
  const off = await rpc(port, { description: 'dog training in austin' });
  check('flag off → 404 not_found', off.status === 404 && off.body && off.body.error === 'not_found',
    `status ${off.status}`);

  // Flag ON + empty input → 400 BEFORE any Stripe call (funds-first safety).
  process.env.JK_X402_ENABLED = '1';
  const bad = await rpc(port, {});
  check('flag on + no input → 400 missing_input (no Stripe call)',
    bad.status === 400 && bad.body && bad.body.error === 'missing_input', `status ${bad.status}`);
  delete process.env.JK_X402_ENABLED;

  server.close();
}

// ── 3. LIVE Stripe sandbox round-trip (--live only) ─────────────────────────
function simulateCryptoDeposit(secretKey, paymentIntentId) {
  // Preview test-helper endpoint, not in SDK v14 — call it raw.
  return new Promise((resolve, reject) => {
    const path = `/v1/payment_intents/${paymentIntentId}/simulate_crypto_deposit`;
    const req = https.request(
      { host: 'api.stripe.com', path, method: 'POST',
        auth: `${secretKey}:`,
        headers: { 'Stripe-Version': '2026-03-04.preview', 'Content-Length': 0 } },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => (res.statusCode < 300
          ? resolve(JSON.parse(buf || '{}'))
          : reject(new Error(`simulate_crypto_deposit ${res.statusCode}: ${buf}`))));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function liveStripeChecks() {
  console.log('\nLIVE: Stripe sandbox crypto round-trip');
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { skip('live round-trip', 'STRIPE_SECRET_KEY not set'); return; }
  if (key.startsWith('sk_live_')) { skip('live round-trip', 'refusing to run against a LIVE key — use a sandbox key'); return; }

  let challenge;
  try {
    challenge = await x402.createCryptoPaymentIntent(30);
  } catch (err) {
    skip('createCryptoPaymentIntent', `${err.message} (is "Stablecoins and Crypto" approved on this sandbox?)`);
    return;
  }
  check('createCryptoPaymentIntent returns a Base deposit address',
    !!challenge.payTo && challenge.paymentIntentId.startsWith('pi_'), JSON.stringify(challenge));

  // Before settlement, verify must reject (not yet succeeded).
  const pre = await x402.verifyPayment({ paymentIntentId: challenge.paymentIntentId }, 30);
  check('verifyPayment rejects before deposit settles', pre.ok === false, pre.reason);

  try {
    await simulateCryptoDeposit(key, challenge.paymentIntentId);
  } catch (err) {
    skip('simulate_crypto_deposit', err.message);
    return;
  }

  const post = await x402.verifyPayment({ paymentIntentId: challenge.paymentIntentId }, 30);
  check('verifyPayment passes after simulated deposit', post.ok === true, post.reason);

  const under = await x402.verifyPayment({ paymentIntentId: challenge.paymentIntentId }, 1000000);
  check('verifyPayment rejects when underpaid', under.ok === false && under.reason === 'underpaid', under.reason);

  const bogus = await x402.verifyPayment({ paymentIntentId: 'pi_does_not_exist' }, 30);
  check('verifyPayment rejects unknown PaymentIntent', bogus.ok === false, bogus.reason);

  const refunded = await x402.refundPayment(challenge.paymentIntentId, 'local test cleanup');
  check('refundPayment succeeds on a settled deposit (D3 answer)', refunded === true);
}

(async () => {
  console.log(`x402 local validation${LIVE ? ' (+ live Stripe sandbox)' : ' (offline)'}\n`);
  offlineUnitChecks();
  await httpContractChecks();
  if (LIVE) await liveStripeChecks();
  else console.log('\n(skipping live Stripe round-trip — pass --live with a sandbox key to run it)');
  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
})();
