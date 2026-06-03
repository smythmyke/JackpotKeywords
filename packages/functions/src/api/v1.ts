/**
 * Public /api/v1 — REST API for external developers.
 *
 * Phase 1A endpoints:
 *   POST /v1/signup          — public. Creates customer, returns API key + $5 credit.
 *   GET  /v1/me              — authed. Returns balance and customer info.
 *   POST /v1/topup           — authed. Creates Stripe checkout for $25/$100/$500/custom.
 *   POST /v1/aeo-scan        — authed. Deducts $1.00, runs AEO scan, returns result.
 *
 * Phase 1B endpoints:
 *   POST   /v1/keys          — authed. Creates a new named API key.
 *   GET    /v1/keys          — authed. Lists active keys (sanitized).
 *   DELETE /v1/keys/:keyId   — authed. Revokes a key.
 *   POST   /v1/recommend     — authed. Deducts $0.10, runs keyword pipeline, returns ranked list.
 *
 * Auth uses Bearer api_key (jk_live_...). See middleware/apiKeyAuth.ts.
 * Per-key rate limit applied to all authed routes. See middleware/apiRateLimit.ts.
 */

import { Router } from 'express';
import Stripe from 'stripe';
import * as functions from 'firebase-functions';
import { apiKeyAuth, type ApiKeyRequest } from '../middleware/apiKeyAuth';
import { apiRateLimit } from '../middleware/apiRateLimit';
import {
  createApiCustomer,
  createApiKeyForCustomer,
  listKeysForCustomer,
  revokeApiKey,
  deductBalance,
  refundBalance,
  recordApiCallResult,
  recordX402Call,
  isAdminApiCustomer,
  isBillingExemptApiCustomer,
  AEO_SCAN_COST_CENTS,
  RECOMMEND_COST_CENTS,
  RECOMMEND_DEEP_COST_CENTS,
  AUDIT_COST_CENTS,
  MIN_TOPUP_CENTS,
  TOPUP_PACKS,
  OPERATION_COST_CENTS,
} from '../services/apiCredits';
import {
  API_JOB_OPERATIONS,
  createApiJob,
  getApiJob,
  type ApiJobOperation,
} from '../services/apiJobs';
import { runAeoScanFull } from '../services/aeoScan';
import { extractProductContext } from '../services/gemini';
import { runRecommendPipeline } from '../services/recommendPipeline';
import { runSeoAudit } from '../services/seoAudit';
import {
  isX402Enabled,
  getX402PriceCents,
  createCryptoPaymentIntent,
  buildChallengeBody,
  extractPaymentProof,
  verifyPayment,
  refundPayment,
  claimFulfillment,
  markFulfillment,
  x402IpRateLimit,
} from '../services/x402';

const router = Router();

/**
 * RapidAPI billing: per-route Credit cost (1 Credit = 1 US cent of list price).
 * Keyed by the router-relative req.path. Endpoints absent here bill 0 Credits.
 */
const RAPIDAPI_BILLABLE_CREDITS: Readonly<Record<string, number>> = {
  '/recommend': RECOMMEND_COST_CENTS,
  '/recommend-deep': RECOMMEND_DEEP_COST_CENTS,
  '/aeo-scan': AEO_SCAN_COST_CENTS,
  '/audit': AUDIT_COST_CENTS,
};

/**
 * Emit the X-RapidAPI-Billing header on RapidAPI-sourced requests so RapidAPI
 * meters the call against our `Credits` custom quota. Patches res.json (read at
 * call time, after apiKeyAuth has set req.apiSource):
 *   - 2xx success → Credits = the route's cent cost
 *   - non-2xx     → Credits = 0 (don't bill the dev for their own bad input;
 *                   RapidAPI also ignores >=500 on its own, matching our
 *                   refund-on-failure contract)
 * No-op for every other surface.
 */
router.use((req: ApiKeyRequest, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body?: unknown) => {
    if (req.apiSource === 'rapidapi') {
      const cost = RAPIDAPI_BILLABLE_CREDITS[req.path] ?? 0;
      const credits = res.statusCode >= 200 && res.statusCode < 300 ? cost : 0;
      res.setHeader('X-RapidAPI-Billing', `Credits=${credits}`);
    }
    return originalJson(body);
  };
  next();
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
});

const APP_URL = process.env.APP_URL || 'https://jackpotkeywords.web.app';

function emailLooksValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * POST /api/v1/signup
 * body: { email }
 * returns: { apiKey, balanceCents, customerId, newSignup }
 *
 * Idempotent on email. Re-signups return a fresh key but do NOT re-award
 * the signup credit.
 */
router.post('/signup', async (req, res) => {
  const email = (req.body?.email || '').toString().trim();
  if (!emailLooksValid(email)) {
    res.status(400).json({ error: 'invalid_email', message: 'A valid email is required.' });
    return;
  }
  try {
    // /signup happens before the caller has a key, so apiKeyAuth doesn't run
    // here. Derive the first-touch source from User-Agent independently.
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    const signupSource = ua.startsWith('jackpotkeywords-mcp-server') ? 'mcp' : 'api';
    const { customer, apiKey, newSignup } = await createApiCustomer(email, signupSource);
    res.json({
      apiKey,
      balanceCents: customer.balanceCents,
      customerId: customer.id,
      newSignup,
      message: newSignup
        ? 'Welcome — your $2.00 starter credit has been applied. Top up via POST /v1/topup ($5 minimum) when you need more.'
        : 'Existing customer — a new API key has been issued. Your previous key still works unless revoked.',
    });
  } catch (err: any) {
    functions.logger.error('v1/signup error:', err.message);
    res.status(500).json({ error: 'signup_failed', message: err.message });
  }
});

/**
 * GET /api/v1/me
 * returns customer info and current balance.
 */
router.get('/me', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  // RapidAPI consumers share the house account — its balance is meaningless to
  // them (RapidAPI owns billing). Return a surface-appropriate probe instead.
  if (req.apiSource === 'rapidapi') {
    res.json({
      surface: 'rapidapi',
      message: 'Authenticated via RapidAPI. Usage is billed through your RapidAPI subscription.',
      creditCosts: {
        '/v1/recommend': RECOMMEND_COST_CENTS,
        '/v1/recommend-deep': RECOMMEND_DEEP_COST_CENTS,
        '/v1/audit': AUDIT_COST_CENTS,
        '/v1/aeo-scan': AEO_SCAN_COST_CENTS,
      },
    });
    return;
  }
  const admin = isAdminApiCustomer(c);
  res.json({
    customerId: c.id,
    email: c.email,
    balanceCents: c.balanceCents,
    balanceUsd: (c.balanceCents / 100).toFixed(2),
    lifetimeDepositedCents: c.lifetimeDepositedCents,
    ...(admin ? { admin: true, message: 'Admin account — calls bypass billing.' } : {}),
  });
});

/**
 * POST /api/v1/topup
 * body: { packId?: 'starter'|'growth'|'scale', amountCents?: number, returnPath? }
 * returns: { url } — Stripe checkout session URL.
 *
 * Either packId OR amountCents (custom). Custom must be >= MIN_TOPUP_CENTS.
 */
router.post('/topup', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const { packId, amountCents: customAmount, returnPath } = req.body || {};

  let amountCents: number;
  let label: string;

  if (packId) {
    const pack = TOPUP_PACKS.find((p) => p.id === packId);
    if (!pack) {
      res.status(400).json({ error: 'invalid_pack', message: `Unknown packId: ${packId}` });
      return;
    }
    amountCents = pack.amountCents;
    label = pack.label;
  } else if (typeof customAmount === 'number' && Number.isFinite(customAmount)) {
    if (customAmount < MIN_TOPUP_CENTS) {
      res.status(400).json({
        error: 'amount_too_low',
        message: `Minimum top-up is ${MIN_TOPUP_CENTS / 100} USD (${MIN_TOPUP_CENTS} cents).`,
      });
      return;
    }
    if (customAmount > 1_000_000) {
      res.status(400).json({ error: 'amount_too_high', message: 'Contact sales for top-ups over $10,000.' });
      return;
    }
    amountCents = Math.round(customAmount);
    label = `$${(amountCents / 100).toFixed(2)}`;
  } else {
    res.status(400).json({ error: 'missing_amount', message: 'Provide packId or amountCents.' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `JackpotKeywords API — ${label} top-up`,
            description: `Adds $${(amountCents / 100).toFixed(2)} of API credit to your account.`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: c.email,
      metadata: {
        purpose: 'api_topup',
        apiCustomerId: c.id,
        amountCents: String(amountCents),
        source: req.apiSource || 'api',
      },
      payment_intent_data: {
        statement_descriptor: 'JACKPOTKEYWORDS API',
      },
      success_url: `${APP_URL}${returnPath || '/developers/dashboard'}?topup=success`,
      cancel_url: `${APP_URL}${returnPath || '/developers/dashboard'}?topup=cancel`,
    });
    res.json({ url: session.url, amountCents });
  } catch (err: any) {
    functions.logger.error('v1/topup error:', err.message);
    res.status(500).json({ error: 'topup_failed', message: err.message });
  }
});

/**
 * POST /api/v1/aeo-scan
 * body: { url, productContext? }
 *
 * Two modes:
 *  - url only: we extract product context via Gemini (more expensive on our side, but free for the customer at the flat $1.00 rate)
 *  - url + productContext: customer-provided context, we skip extraction
 *
 * Cost: $1.00 deducted from balance up-front. Refunded on pipeline failure.
 */
router.post('/aeo-scan', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const url = (req.body?.url || '').toString().trim();
  let context = req.body?.productContext;

  if (!url) {
    res.status(400).json({ error: 'missing_url', message: 'A url is required.' });
    return;
  }

  if (!isBillingExemptApiCustomer(c) && c.balanceCents < AEO_SCAN_COST_CENTS) {
    res.status(402).json({
      error: 'insufficient_balance',
      message: `Need ${AEO_SCAN_COST_CENTS} cents (have ${c.balanceCents}). Top up with POST /v1/topup.`,
      balanceCents: c.balanceCents,
    });
    return;
  }

  let newBalance: number;
  let callId: string;
  try {
    ({ newBalance, callId } = await deductBalance(c.id, AEO_SCAN_COST_CENTS, '/v1/aeo-scan', req.apiSource));
  } catch (err: any) {
    res.status(402).json({ error: 'insufficient_balance', message: err.message });
    return;
  }

  const startTime = Date.now();
  try {
    if (!context) {
      functions.logger.info(`v1/aeo-scan: extracting context for ${url}`);
      context = await extractProductContext('', url);
    }
    const aeoResult = await runAeoScanFull(context, url);
    const latencyMs = Date.now() - startTime;
    res.json({
      url,
      productName: context.productName || context.productLabel,
      ...aeoResult,
      balanceCents: newBalance,
      executionTimeMs: latencyMs,
    });
    void recordApiCallResult(callId, { ok: true, latencyMs });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    functions.logger.error('v1/aeo-scan error:', err.message);
    let refunded = false;
    try {
      await refundBalance(c.id, AEO_SCAN_COST_CENTS, `aeo-scan failed: ${err.message}`);
      refunded = true;
    } catch { /* non-fatal */ }
    void recordApiCallResult(callId, {
      ok: false,
      latencyMs,
      errCode: errCodeFromMessage(err.message),
      refunded,
    });
    res.status(500).json({
      error: 'scan_failed',
      message: 'AEO scan failed. Your balance has been refunded.',
    });
  }
});

/**
 * POST /api/v1/keys
 * body: { name? } — friendly label for this key
 * returns: { apiKey, keyId, name, prefix, createdAt }
 *
 * Raw key shown ONCE. We store only the sha256 hash; lost keys cannot be
 * recovered, only rotated by creating a new one.
 */
router.post('/keys', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const name = (req.body?.name || 'unnamed').toString().trim();
  try {
    const result = await createApiKeyForCustomer(c.id, name);
    res.json(result);
  } catch (err: any) {
    functions.logger.error('v1/keys POST error:', err.message);
    res.status(500).json({ error: 'key_create_failed', message: err.message });
  }
});

/**
 * GET /api/v1/keys
 * returns: { keys: [{ keyId, name, prefix, createdAt, lastUsedAt }] }
 *
 * Only non-revoked keys. Sanitized — no secret material.
 */
router.get('/keys', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  try {
    const keys = await listKeysForCustomer(c.id);
    res.json({ keys });
  } catch (err: any) {
    functions.logger.error('v1/keys GET error:', err.message);
    res.status(500).json({ error: 'key_list_failed', message: err.message });
  }
});

/**
 * DELETE /api/v1/keys/:keyId
 * Soft-revokes the key. The key being used to make the request CAN revoke
 * itself — the in-flight request still completes, but next call fails.
 */
router.delete('/keys/:keyId', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const keyId = req.params.keyId;
  if (!keyId || keyId.length !== 64) {
    res.status(400).json({ error: 'invalid_key_id', message: 'keyId must be a 64-char sha256 hash.' });
    return;
  }
  try {
    const result = await revokeApiKey(c.id, keyId);
    if (!result.ok) {
      const status = result.reason === 'key_not_found' || result.reason === 'not_your_key' ? 404 : 400;
      res.status(status).json({ error: result.reason });
      return;
    }
    res.json({ ok: true, keyId });
  } catch (err: any) {
    functions.logger.error('v1/keys DELETE error:', err.message);
    res.status(500).json({ error: 'key_revoke_failed', message: err.message });
  }
});

/**
 * POST /api/v1/recommend
 * body: { description?, url?, budget?, location?, limit? }
 *
 * Runs the keyword research pipeline (context extraction → seeds →
 * autocomplete → Keyword Planner → trends → AI scoring) and returns ranked
 * keywords sorted by jackpotScore_v2 descending.
 *
 * Cost: $0.10 (10 cents). Refunded on pipeline failure.
 * Defaults: limit=50, max=200. URL is optional but recommended for better
 * context extraction. At least one of description / url required.
 */
router.post('/recommend', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const { description, url, budget, location, limit: rawLimit } = req.body || {};

  if ((!description || !description.toString().trim()) && (!url || !url.toString().trim())) {
    res.status(400).json({
      error: 'missing_input',
      message: 'Provide a "description" or "url" (or both).',
    });
    return;
  }

  const limit = Math.max(1, Math.min(200, parseInt(rawLimit, 10) || 50));

  if (!isBillingExemptApiCustomer(c) && c.balanceCents < RECOMMEND_COST_CENTS) {
    res.status(402).json({
      error: 'insufficient_balance',
      message: `Need ${RECOMMEND_COST_CENTS} cents (have ${c.balanceCents}). Top up with POST /v1/topup.`,
      balanceCents: c.balanceCents,
    });
    return;
  }

  let newBalance: number;
  let callId: string;
  try {
    ({ newBalance, callId } = await deductBalance(c.id, RECOMMEND_COST_CENTS, '/v1/recommend', req.apiSource));
  } catch (err: any) {
    res.status(402).json({ error: 'insufficient_balance', message: err.message });
    return;
  }

  const startTime = Date.now();
  try {
    const result = await runRecommendPipeline({ description, url, budget, location, limit });
    const latencyMs = Date.now() - startTime;
    res.json({
      productName: result.productName,
      query: result.query,
      url: result.url,
      recommendations: result.recommendations,
      totalCandidates: result.totalCandidates,
      returned: result.returned,
      balanceCents: newBalance,
      executionTimeMs: latencyMs,
    });
    void recordApiCallResult(callId, {
      ok: true,
      latencyMs,
      resultCount: result.returned,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    functions.logger.error('v1/recommend error:', err.stack || err.message);
    let refunded = false;
    try {
      await refundBalance(c.id, RECOMMEND_COST_CENTS, `recommend failed: ${err.message}`);
      refunded = true;
    } catch { /* non-fatal */ }
    void recordApiCallResult(callId, {
      ok: false,
      latencyMs,
      errCode: errCodeFromMessage(err.message),
      refunded,
    });
    res.status(500).json({
      error: 'recommend_failed',
      message: 'Keyword recommendation failed. Your balance has been refunded.',
    });
  }
});

/**
 * Bucket a free-form error message into a stable code we can group by in usage
 * reports. Keeps the cardinality low so per-error-code aggregations stay
 * useful even with a small sample.
 */
function errCodeFromMessage(message: string): string {
  if (!message) return 'unknown';
  const m = message.toLowerCase();
  if (m.includes('timeout') || m.includes('etimedout')) return 'timeout';
  if (m.includes('rate limit') || m.includes('429')) return 'upstream_rate_limit';
  if (m.includes('quota')) return 'upstream_quota';
  if (m.includes('503') || m.includes('unavailable')) return 'upstream_unavailable';
  if (m.includes('502') || m.includes('bad gateway')) return 'upstream_bad_gateway';
  if (m.includes('gemini') || m.includes('vertex')) return 'gemini_error';
  if (m.includes('keyword planner') || m.includes('google ads')) return 'kp_error';
  if (m.includes('serper')) return 'serper_error';
  if (m.includes('fetch failed') || m.includes('econnrefused') || m.includes('enotfound')) return 'network_error';
  if (m.includes('invalid') || m.includes('parse')) return 'parse_error';
  return 'other';
}

/**
 * POST /api/v1/recommend-deep
 * body: { description?, url?, budget?, location?, limit? }
 *
 * Same input contract as /v1/recommend, but runs the fuller consumer-search
 * pipeline: adds competitor discovery in parallel with autocomplete, and
 * surfaces the cluster + category + competitor-brand aggregates that
 * /v1/recommend computes internally and then discards.
 *
 * Cost: $0.30 (30 cents) — 3x /v1/recommend. Refunded on pipeline failure.
 * Defaults: limit=50, max=200.
 */
router.post('/recommend-deep', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const { description, url, budget, location, limit: rawLimit } = req.body || {};

  if ((!description || !description.toString().trim()) && (!url || !url.toString().trim())) {
    res.status(400).json({
      error: 'missing_input',
      message: 'Provide a "description" or "url" (or both).',
    });
    return;
  }

  const limit = Math.max(1, Math.min(200, parseInt(rawLimit, 10) || 50));

  if (!isBillingExemptApiCustomer(c) && c.balanceCents < RECOMMEND_DEEP_COST_CENTS) {
    res.status(402).json({
      error: 'insufficient_balance',
      message: `Need ${RECOMMEND_DEEP_COST_CENTS} cents (have ${c.balanceCents}). Top up with POST /v1/topup.`,
      balanceCents: c.balanceCents,
    });
    return;
  }

  let newBalance: number;
  let callId: string;
  try {
    ({ newBalance, callId } = await deductBalance(c.id, RECOMMEND_DEEP_COST_CENTS, '/v1/recommend-deep', req.apiSource));
  } catch (err: any) {
    res.status(402).json({ error: 'insufficient_balance', message: err.message });
    return;
  }

  const startTime = Date.now();
  try {
    const result = await runRecommendPipeline({ description, url, budget, location, limit }, { deep: true });
    const latencyMs = Date.now() - startTime;
    res.json({
      productName: result.productName,
      query: result.query,
      url: result.url,
      recommendations: result.recommendations,
      clusters: result.clusters,
      categories: result.categories,
      competitors: result.competitors,
      totalCandidates: result.totalCandidates,
      returned: result.returned,
      balanceCents: newBalance,
      executionTimeMs: latencyMs,
    });
    void recordApiCallResult(callId, {
      ok: true,
      latencyMs,
      resultCount: result.returned,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    functions.logger.error('v1/recommend-deep error:', err.stack || err.message);
    let refunded = false;
    try {
      await refundBalance(c.id, RECOMMEND_DEEP_COST_CENTS, `recommend-deep failed: ${err.message}`);
      refunded = true;
    } catch { /* non-fatal */ }
    void recordApiCallResult(callId, {
      ok: false,
      latencyMs,
      errCode: errCodeFromMessage(err.message),
      refunded,
    });
    res.status(500).json({
      error: 'recommend_deep_failed',
      message: 'Deep keyword recommendation failed. Your balance has been refunded.',
    });
  }
});

/**
 * POST /api/v1/x402/recommend  — x402 agent-payments pilot (X402-1a spike)
 *
 * Pay-per-call variant of /v1/recommend-deep for autonomous agents: no API key,
 * no prepaid balance, no human checkout. Gated by HTTP 402 + USDC-on-Base
 * settled through Stripe's crypto PaymentIntent. Flag-gated (JK_X402_ENABLED) —
 * 404s when off, so prod is unaffected until deliberately enabled in a sandbox
 * with the "Stablecoins and Crypto" payment method approved.
 *
 * Two-call protocol:
 *   1. no X-PAYMENT  → 402 + payment-requirements challenge (a fresh deposit address)
 *   2. with X-PAYMENT → verify the payment settled, run recommend-deep, refund on failure
 *
 * Deliberately NOT behind apiKeyAuth/apiRateLimit (it gates on payment, not
 * identity); uses an IP-keyed limiter instead. See services/x402.ts for the
 * spike's honest limitations (SDK-cast preview surface + simplified proof format).
 */
router.post('/x402/recommend', x402IpRateLimit, async (req, res) => {
  if (!isX402Enabled()) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const { description, url, budget, location, limit: rawLimit } = req.body || {};

  // Validate input BEFORE issuing a challenge, so a bad request never results
  // in the agent paying for a call we'd reject (the deposit model is funds-first).
  if ((!description || !description.toString().trim()) && (!url || !url.toString().trim())) {
    res.status(400).json({ error: 'missing_input', message: 'Provide a "description" or "url" (or both).' });
    return;
  }
  const limit = Math.max(1, Math.min(200, parseInt(rawLimit, 10) || 50));
  const priceCents = getX402PriceCents();

  const proof = extractPaymentProof(req);

  // ── Step 1: unpaid request → issue the 402 challenge ──────────────────────
  if (!proof) {
    try {
      const challenge = await createCryptoPaymentIntent(priceCents);
      const resourceUrl = `${req.baseUrl}${req.path}`;
      res.status(402).set('Accept-Payment', 'x402').json(buildChallengeBody(challenge, resourceUrl));
    } catch (err: any) {
      functions.logger.error('v1/x402/recommend challenge error:', err.message);
      res.status(500).json({ error: 'challenge_failed', message: 'Could not create a payment challenge.' });
    }
    return;
  }

  // ── Step 2: paid retry → verify, then run ────────────────────────────────
  const verdict = await verifyPayment(proof, priceCents);
  if (!verdict.ok) {
    res.status(402).json({ error: 'payment_unverified', message: `Payment not verified: ${verdict.reason}.` });
    return;
  }

  // Idempotency: never run a paid pipeline twice for one settlement.
  const claim = await claimFulfillment(proof.paymentIntentId);
  if (!claim.ok) {
    const status = claim.status === 'refunded' ? 402 : 409;
    res.status(status).json({
      error: claim.status === 'refunded' ? 'payment_already_refunded' : 'already_fulfilled',
      message:
        claim.status === 'refunded'
          ? 'This payment was refunded after a failed run. Submit a new payment to retry.'
          : 'This payment has already been used.',
    });
    return;
  }

  let callId: string;
  try {
    ({ callId } = await recordX402Call({
      endpoint: '/v1/x402/recommend',
      costCents: priceCents,
      settlementRef: proof.paymentIntentId,
    }));
  } catch (err: any) {
    functions.logger.error('v1/x402/recommend ledger error:', err.message);
    callId = '';
  }

  const startTime = Date.now();
  try {
    const result = await runRecommendPipeline({ description, url, budget, location, limit }, { deep: true });
    const latencyMs = Date.now() - startTime;
    await markFulfillment(proof.paymentIntentId, 'fulfilled');
    res.set('X-Payment-Response', `settled paymentIntent=${proof.paymentIntentId}`).json({
      productName: result.productName,
      query: result.query,
      url: result.url,
      recommendations: result.recommendations,
      clusters: result.clusters,
      categories: result.categories,
      competitors: result.competitors,
      totalCandidates: result.totalCandidates,
      returned: result.returned,
      paidCents: priceCents,
      executionTimeMs: latencyMs,
    });
    if (callId) void recordApiCallResult(callId, { ok: true, latencyMs, resultCount: result.returned });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    functions.logger.error('v1/x402/recommend pipeline error:', err.stack || err.message);
    const refunded = await refundPayment(proof.paymentIntentId, `recommend failed: ${err.message}`);
    await markFulfillment(proof.paymentIntentId, 'refunded');
    if (callId) {
      void recordApiCallResult(callId, {
        ok: false,
        latencyMs,
        errCode: errCodeFromMessage(err.message),
        refunded,
      });
    }
    res.status(500).json({
      error: 'recommend_failed',
      message: refunded
        ? 'Keyword recommendation failed. Your payment has been refunded.'
        : 'Keyword recommendation failed. Refund could not be issued automatically — contact support.',
    });
  }
});

/**
 * POST /api/v1/audit
 * body: { url }
 *
 * SEO audit: page-quality checks, keyword gaps, recommendations, per-page
 * issues, scores. AEO is intentionally NOT bundled — customers who want
 * AI-visibility data buy it separately via /v1/aeo-scan.
 *
 * Cost: $0.50 (50 cents). Refunded on pipeline failure.
 */
router.post('/audit', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const rawUrl = (req.body?.url || '').toString().trim();

  if (!rawUrl) {
    res.status(400).json({ error: 'missing_url', message: 'A url is required.' });
    return;
  }

  // Normalize + validate (mirrors consumer audit handler)
  let normalizedUrl = rawUrl;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  try {
    const parsed = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    res.status(400).json({
      error: 'invalid_url',
      message: 'Invalid URL. Provide a domain like example.com or a full URL like https://example.com.',
    });
    return;
  }

  if (!isBillingExemptApiCustomer(c) && c.balanceCents < AUDIT_COST_CENTS) {
    res.status(402).json({
      error: 'insufficient_balance',
      message: `Need ${AUDIT_COST_CENTS} cents (have ${c.balanceCents}). Top up with POST /v1/topup.`,
      balanceCents: c.balanceCents,
    });
    return;
  }

  let newBalance: number;
  let callId: string;
  try {
    ({ newBalance, callId } = await deductBalance(c.id, AUDIT_COST_CENTS, '/v1/audit', req.apiSource));
  } catch (err: any) {
    res.status(402).json({ error: 'insufficient_balance', message: err.message });
    return;
  }

  const startTime = Date.now();
  try {
    const auditData = await runSeoAudit(normalizedUrl, { includeAeo: false });
    const latencyMs = Date.now() - startTime;
    res.json({
      ...auditData,
      url: normalizedUrl,
      balanceCents: newBalance,
      executionTimeMs: latencyMs,
    });
    void recordApiCallResult(callId, { ok: true, latencyMs });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    functions.logger.error('v1/audit error:', err.stack || err.message);
    let refunded = false;
    try {
      await refundBalance(c.id, AUDIT_COST_CENTS, `audit failed: ${err.message}`);
      refunded = true;
    } catch { /* non-fatal */ }
    void recordApiCallResult(callId, {
      ok: false,
      latencyMs,
      errCode: errCodeFromMessage(err.message),
      refunded,
    });
    res.status(500).json({
      error: 'audit_failed',
      message: 'SEO audit failed. Your balance has been refunded.',
    });
  }
});

/**
 * SSRF guard for job callback URLs. Only https URLs to allow-listed hosts may
 * receive job results. Defaults to Zapier's hook hosts.
 */
const JOB_CALLBACK_HOSTS = (process.env.JK_JOB_CALLBACK_HOSTS || 'hooks.zapier.com,zapier.com')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function callbackUrlAllowed(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return JOB_CALLBACK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * POST /api/v1/jobs
 * body: { operation, input, callbackUrl? }
 *
 * Async wrapper for the long-running synchronous endpoints, for surfaces that
 * can't hold a 60-180s request open (e.g. Zapier's 30s action timeout). Enqueues
 * a job (Firestore onCreate trigger runs it), returns immediately. When done,
 * the worker POSTs the result to callbackUrl (if given) and/or it's pollable via
 * GET /v1/jobs/:id.
 *
 * Billing is NOT done here — the worker calls the matching sync endpoint, which
 * deducts/refunds exactly as a direct call would. The balance check below is a
 * fast-fail courtesy so we don't enqueue a job that can't pay.
 */
router.post('/jobs', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const { operation, input, callbackUrl } = req.body || {};

  if (typeof operation !== 'string' || !API_JOB_OPERATIONS.has(operation)) {
    res.status(400).json({
      error: 'invalid_operation',
      message: `operation must be one of: ${[...API_JOB_OPERATIONS].join(', ')}.`,
    });
    return;
  }
  const op = operation as ApiJobOperation;
  const inp: Record<string, unknown> =
    input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  // Light input validation mirroring the sync endpoints, so obviously-doomed
  // jobs are rejected synchronously rather than failing later via callback.
  const hasUrl = typeof inp.url === 'string' && inp.url.trim().length > 0;
  const hasDescription = typeof inp.description === 'string' && inp.description.trim().length > 0;
  if ((op === 'aeo-scan' || op === 'audit') && !hasUrl) {
    res.status(400).json({ error: 'missing_url', message: 'input.url is required for this operation.' });
    return;
  }
  if ((op === 'recommend' || op === 'recommend-deep') && !hasUrl && !hasDescription) {
    res.status(400).json({ error: 'missing_input', message: 'Provide input.url and/or input.description.' });
    return;
  }

  if (callbackUrl !== undefined) {
    if (typeof callbackUrl !== 'string' || !callbackUrlAllowed(callbackUrl)) {
      res.status(400).json({
        error: 'invalid_callback_url',
        message: `callbackUrl must be an https URL on an allowed host (${JOB_CALLBACK_HOSTS.join(', ')}).`,
      });
      return;
    }
  }

  // Fast-fail balance check (the worker's sync call is the real deduction).
  const cost = OPERATION_COST_CENTS[op] ?? 0;
  if (!isBillingExemptApiCustomer(c) && c.balanceCents < cost) {
    res.status(402).json({
      error: 'insufficient_balance',
      message: `Need ${cost} cents (have ${c.balanceCents}). Top up with POST /v1/topup.`,
      balanceCents: c.balanceCents,
    });
    return;
  }

  try {
    const jobId = await createApiJob({
      customerId: c.id,
      operation: op,
      input: inp,
      callbackUrl: typeof callbackUrl === 'string' ? callbackUrl : undefined,
    });
    res.json({
      jobId,
      status: 'processing',
      operation: op,
      message: callbackUrl
        ? 'Job queued. The result will be POSTed to your callback URL when ready.'
        : 'Job queued. Poll GET /v1/jobs/{jobId} for the result.',
    });
  } catch (err: any) {
    functions.logger.error('v1/jobs POST error:', err.message);
    res.status(500).json({ error: 'job_create_failed', message: err.message });
  }
});

/**
 * GET /api/v1/jobs/:id
 * Returns job status and, once finished, the result or error. Customers can
 * only read their own jobs.
 */
router.get('/jobs/:id', apiKeyAuth, apiRateLimit, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const job = await getApiJob(req.params.id);
  if (!job || job.customerId !== c.id) {
    res.status(404).json({ error: 'job_not_found' });
    return;
  }
  res.json({
    jobId: job.id,
    operation: job.operation,
    status: job.status,
    ...(job.status === 'success' ? { result: job.result } : {}),
    ...(job.status === 'error' ? { error: job.error } : {}),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
});

export default router;
