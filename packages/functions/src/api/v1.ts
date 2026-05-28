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
  isAdminApiCustomer,
  AEO_SCAN_COST_CENTS,
  RECOMMEND_COST_CENTS,
  RECOMMEND_DEEP_COST_CENTS,
  AUDIT_COST_CENTS,
  MIN_TOPUP_CENTS,
  TOPUP_PACKS,
} from '../services/apiCredits';
import { runAeoScanFull } from '../services/aeoScan';
import {
  extractProductContext,
  generateSeeds,
  scoreAndClassify,
} from '../services/gemini';
import {
  expandAutocomplete,
  discoverCompetitors,
} from '../services/autocomplete';
import { enrichKeywords } from '../services/keywordPlanner';
import { fetchAndParse } from '../services/htmlParser';
import { overlayTrends } from '../services/googleTrends';
import { inferCategory } from '../services/categoryInference';
import { runSeoAudit } from '../services/seoAudit';

const router = Router();

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

  if (!isAdminApiCustomer(c) && c.balanceCents < AEO_SCAN_COST_CENTS) {
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

  if (!isAdminApiCustomer(c) && c.balanceCents < RECOMMEND_COST_CENTS) {
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
    // Step 0: Optional URL fetch + product context extraction
    let parsedPage: Awaited<ReturnType<typeof fetchAndParse>> | undefined;
    if (url) {
      parsedPage = await fetchAndParse(url.toString());
    }
    const context = await extractProductContext(
      (description || '').toString(),
      url ? url.toString() : undefined,
      parsedPage,
    );

    // Step 1: AI seed generation
    const seeds = await generateSeeds(context, location);

    // Step 2: Autocomplete expansion (skipping competitor discovery for API
    // recommend — adds 5+ seconds and competitors are surfaced separately
    // via context.competitors anyway)
    const autocompleteKeywords = await expandAutocomplete(seeds.topSeeds);

    // Step 3: Merge & dedupe seeds + autocomplete keywords
    const sourceCounts = new Map<string, Set<string>>();
    const seen = new Set<string>();
    const masterList: { keyword: string; category: string; source: string }[] = [];
    for (const seed of seeds.allSeeds) {
      const key = seed.keyword.toLowerCase().trim();
      const set = sourceCounts.get(key) ?? new Set<string>();
      set.add(seed.source);
      sourceCounts.set(key, set);
      if (!seen.has(key)) {
        seen.add(key);
        masterList.push(seed);
      }
    }
    for (const kw of autocompleteKeywords) {
      const key = kw.keyword.toLowerCase().trim();
      const set = sourceCounts.get(key) ?? new Set<string>();
      set.add(kw.source);
      sourceCounts.set(key, set);
      if (!seen.has(key)) {
        seen.add(key);
        masterList.push({ ...kw, category: inferCategory(kw.keyword) });
      }
    }

    // Step 4: Google Ads Keyword Planner enrichment
    const enriched = await enrichKeywords(masterList);
    for (const kw of enriched) {
      const key = kw.keyword.toLowerCase().trim();
      const src = (kw as any).source;
      if (src) {
        const set = sourceCounts.get(key) ?? new Set<string>();
        set.add(src);
        sourceCounts.set(key, set);
      }
    }
    let maxPlatforms = 1;
    for (const set of sourceCounts.values()) {
      if (set.size > maxPlatforms) maxPlatforms = set.size;
    }

    // Step 5: Google Trends overlay
    const withTrends = await overlayTrends(enriched);

    // Step 6: AI scoring + classification (writes jackpotScore + jackpotScore_v2)
    const scored = await scoreAndClassify(withTrends, context, budget, { sourceCounts, maxPlatforms });

    // Sort by v2 (composite) score descending and trim to limit
    scored.keywords.sort((a, b) => (b.jackpotScore_v2 ?? b.jackpotScore) - (a.jackpotScore_v2 ?? a.jackpotScore));
    const recommendations = scored.keywords.slice(0, limit).map((kw) => ({
      keyword: kw.keyword,
      monthlyVolume: kw.avgMonthlySearches,
      lowCpc: kw.lowCpc,
      highCpc: kw.highCpc,
      competition: kw.competition,
      jackpotScore: kw.jackpotScore_v2 ?? kw.jackpotScore,
      intent: kw.intent,
      category: kw.category,
      trendDirection: kw.trendDirection,
      suggestHits: kw.suggestHits,
    }));

    const latencyMs = Date.now() - startTime;
    res.json({
      productName: context.productName || context.productLabel,
      query: description || '',
      url: url || '',
      recommendations,
      totalCandidates: scored.keywords.length,
      returned: recommendations.length,
      balanceCents: newBalance,
      executionTimeMs: latencyMs,
    });
    void recordApiCallResult(callId, {
      ok: true,
      latencyMs,
      resultCount: recommendations.length,
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

  if (!isAdminApiCustomer(c) && c.balanceCents < RECOMMEND_DEEP_COST_CENTS) {
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
    // Step 0: URL fetch + context
    let parsedPage: Awaited<ReturnType<typeof fetchAndParse>> | undefined;
    if (url) {
      parsedPage = await fetchAndParse(url.toString());
    }
    const context = await extractProductContext(
      (description || '').toString(),
      url ? url.toString() : undefined,
      parsedPage,
    );

    // Step 1: AI seed generation
    const seeds = await generateSeeds(context, location);

    // Step 1b + 2: Competitor discovery + autocomplete in parallel (the
    // "deep" delta vs /v1/recommend). Adds competitor-derived seeds to
    // the master list, which broadens KP enrichment downstream.
    const [competitorSeeds, autocompleteKeywords] = await Promise.all([
      discoverCompetitors(seeds.productLabel, seeds.allSeeds),
      expandAutocomplete(seeds.topSeeds),
    ]);
    if (competitorSeeds.length > 0) {
      seeds.allSeeds.push(...competitorSeeds);
    }

    // Step 3: Merge & dedupe seeds + autocomplete
    const sourceCounts = new Map<string, Set<string>>();
    const seen = new Set<string>();
    const masterList: { keyword: string; category: string; source: string }[] = [];
    for (const seed of seeds.allSeeds) {
      const key = seed.keyword.toLowerCase().trim();
      const set = sourceCounts.get(key) ?? new Set<string>();
      set.add(seed.source);
      sourceCounts.set(key, set);
      if (!seen.has(key)) {
        seen.add(key);
        masterList.push(seed);
      }
    }
    for (const kw of autocompleteKeywords) {
      const key = kw.keyword.toLowerCase().trim();
      const set = sourceCounts.get(key) ?? new Set<string>();
      set.add(kw.source);
      sourceCounts.set(key, set);
      if (!seen.has(key)) {
        seen.add(key);
        masterList.push({ ...kw, category: inferCategory(kw.keyword) });
      }
    }

    // Step 4: KP enrichment
    const enriched = await enrichKeywords(masterList);
    for (const kw of enriched) {
      const key = kw.keyword.toLowerCase().trim();
      const src = (kw as any).source;
      if (src) {
        const set = sourceCounts.get(key) ?? new Set<string>();
        set.add(src);
        sourceCounts.set(key, set);
      }
    }
    let maxPlatforms = 1;
    for (const set of sourceCounts.values()) {
      if (set.size > maxPlatforms) maxPlatforms = set.size;
    }

    // Step 5: Trends overlay
    const withTrends = await overlayTrends(enriched);

    // Step 6: AI scoring + classification (writes clusters + categories)
    const scored = await scoreAndClassify(withTrends, context, budget, { sourceCounts, maxPlatforms });

    scored.keywords.sort((a, b) => (b.jackpotScore_v2 ?? b.jackpotScore) - (a.jackpotScore_v2 ?? a.jackpotScore));
    const recommendations = scored.keywords.slice(0, limit).map((kw) => ({
      keyword: kw.keyword,
      monthlyVolume: kw.avgMonthlySearches,
      lowCpc: kw.lowCpc,
      highCpc: kw.highCpc,
      competition: kw.competition,
      jackpotScore: kw.jackpotScore_v2 ?? kw.jackpotScore,
      intent: kw.intent,
      category: kw.category,
      trendDirection: kw.trendDirection,
      suggestHits: kw.suggestHits,
    }));

    const latencyMs = Date.now() - startTime;
    res.json({
      productName: context.productName || context.productLabel,
      query: description || '',
      url: url || '',
      recommendations,
      clusters: scored.clusters,
      categories: scored.categories,
      competitors: context.competitors,
      totalCandidates: scored.keywords.length,
      returned: recommendations.length,
      balanceCents: newBalance,
      executionTimeMs: latencyMs,
    });
    void recordApiCallResult(callId, {
      ok: true,
      latencyMs,
      resultCount: recommendations.length,
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

  if (!isAdminApiCustomer(c) && c.balanceCents < AUDIT_COST_CENTS) {
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

export default router;
