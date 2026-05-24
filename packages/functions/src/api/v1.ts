/**
 * Public /api/v1 — REST API for external developers.
 *
 * Phase 1A endpoints:
 *   POST /v1/signup          — public. Creates customer, returns API key + $5 credit.
 *   GET  /v1/me              — authed. Returns balance and customer info.
 *   POST /v1/topup           — authed. Creates Stripe checkout for $25/$100/$500/custom.
 *   POST /v1/aeo-scan        — authed. Deducts $1.00, runs AEO scan, returns result.
 *
 * Auth uses Bearer api_key (jk_live_...). See middleware/apiKeyAuth.ts.
 */

import { Router } from 'express';
import Stripe from 'stripe';
import * as functions from 'firebase-functions';
import { apiKeyAuth, type ApiKeyRequest } from '../middleware/apiKeyAuth';
import {
  createApiCustomer,
  deductBalance,
  refundBalance,
  AEO_SCAN_COST_CENTS,
  MIN_TOPUP_CENTS,
  TOPUP_PACKS,
} from '../services/apiCredits';
import { runAeoScanFull } from '../services/aeoScan';
import { extractProductContext } from '../services/gemini';

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
    const { customer, apiKey, newSignup } = await createApiCustomer(email);
    res.json({
      apiKey,
      balanceCents: customer.balanceCents,
      customerId: customer.id,
      newSignup,
      message: newSignup
        ? 'Welcome — your $5.00 starter credit has been applied.'
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
router.get('/me', apiKeyAuth, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  res.json({
    customerId: c.id,
    email: c.email,
    balanceCents: c.balanceCents,
    balanceUsd: (c.balanceCents / 100).toFixed(2),
    lifetimeDepositedCents: c.lifetimeDepositedCents,
  });
});

/**
 * POST /api/v1/topup
 * body: { packId?: 'starter'|'growth'|'scale', amountCents?: number, returnPath? }
 * returns: { url } — Stripe checkout session URL.
 *
 * Either packId OR amountCents (custom). Custom must be >= MIN_TOPUP_CENTS.
 */
router.post('/topup', apiKeyAuth, async (req: ApiKeyRequest, res) => {
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
router.post('/aeo-scan', apiKeyAuth, async (req: ApiKeyRequest, res) => {
  const c = req.apiCustomer!;
  const url = (req.body?.url || '').toString().trim();
  let context = req.body?.productContext;

  if (!url) {
    res.status(400).json({ error: 'missing_url', message: 'A url is required.' });
    return;
  }

  if (c.balanceCents < AEO_SCAN_COST_CENTS) {
    res.status(402).json({
      error: 'insufficient_balance',
      message: `Need ${AEO_SCAN_COST_CENTS} cents (have ${c.balanceCents}). Top up with POST /v1/topup.`,
      balanceCents: c.balanceCents,
    });
    return;
  }

  let newBalance: number;
  try {
    newBalance = await deductBalance(c.id, AEO_SCAN_COST_CENTS, '/v1/aeo-scan');
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
    res.json({
      url,
      productName: context.productName || context.productLabel,
      ...aeoResult,
      balanceCents: newBalance,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (err: any) {
    functions.logger.error('v1/aeo-scan error:', err.message);
    try {
      await refundBalance(c.id, AEO_SCAN_COST_CENTS, `aeo-scan failed: ${err.message}`);
    } catch { /* non-fatal */ }
    res.status(500).json({
      error: 'scan_failed',
      message: 'AEO scan failed. Your balance has been refunded.',
    });
  }
});

export default router;
