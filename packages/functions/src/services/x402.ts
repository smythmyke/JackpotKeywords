/**
 * x402 agent-payments — isolated Stripe-preview surface (roadmap X402-1a spike).
 *
 * x402 revives HTTP 402 so an autonomous agent can pay-per-call inline (USDC on
 * Base) with no account / API key / human checkout. This module encapsulates
 * EVERYTHING preview/Stripe-specific so the rest of /v1 stays on the stable
 * 2024-11-20.acacia API version and the prepaid `jk_live_` model is untouched.
 *
 * Flow (see docs/api-deployment/X402-PILOT-PLAN-2026-06-02.md §6.1):
 *   1. unpaid request            → 402 + challenge (a fresh crypto PaymentIntent's deposit address)
 *   2. agent pays USDC, retries with X-PAYMENT → verify the PaymentIntent settled
 *   3. run the pipeline; on failure REFUND the PaymentIntent (deposit model is funds-first)
 *
 * SPIKE SCOPE / honest limitations (do not ship to prod without addressing):
 *   - Stripe SDK is v14, which predates the preview crypto surface. The crypto
 *     PaymentIntent params + next_action shape are cast through `unknown`; this
 *     code only executes when JK_X402_ENABLED=1 AND the Stripe account has the
 *     "Stablecoins and Crypto" payment method approved (sandbox first). It is
 *     inert in prod while the flag is off. Upgrade the SDK before 1b.
 *   - The payment proof is a SPIKE-SIMPLIFIED format (the client echoes the
 *     PaymentIntent id we put in the challenge), NOT the real x402 EIP-712
 *     base64 wire format. So Stripe's `purl` CLI / `@x402/*` facilitator
 *     middleware will NOT drive this as-is. Adopting the real wire format (or
 *     the @x402 middleware via dynamic import) is a 1b task.
 */

import * as admin from 'firebase-admin';
import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import * as functions from 'firebase-functions';
import { RECOMMEND_DEEP_COST_CENTS } from './apiCredits';

const db = admin.firestore();

/** Base mainnet (eip155:8453). Sandbox uses Base Sepolia (eip155:84532). */
const BASE_MAINNET_CHAIN = 'eip155:8453';

/** Master switch. Default OFF — the route 404s unless this is set. */
export function isX402Enabled(): boolean {
  return process.env.JK_X402_ENABLED === '1' || process.env.JK_X402_ENABLED === 'true';
}

/** Per-call price in cents. Defaults to the recommend-deep price ($0.30). */
export function getX402PriceCents(): number {
  const raw = parseInt(process.env.JK_X402_PRICE_CENTS || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : RECOMMEND_DEEP_COST_CENTS;
}

/**
 * Dedicated Stripe client pinned to the preview API version that exposes the
 * crypto deposit surface. Kept separate from the v1 client (acacia) so the
 * preview version never leaks into the stable billing paths.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // v14 types don't know the preview version string; cast intentionally.
  apiVersion: '2026-03-04.preview' as unknown as Stripe.LatestApiVersion,
});

export interface X402Challenge {
  paymentIntentId: string;
  payTo: string;
  amountCents: number;
  network: string;
  asset: 'USDC';
}

/**
 * Create a crypto PaymentIntent (deposit mode, Base) and return the deposit
 * address to advertise in the 402 challenge. Stripe auto-captures the PI when
 * the USDC deposit confirms on-chain.
 */
export async function createCryptoPaymentIntent(amountCents: number): Promise<X402Challenge> {
  const params = {
    amount: amountCents,
    currency: 'usd',
    payment_method_types: ['crypto'],
    payment_method_options: {
      crypto: { mode: 'deposit', deposit_options: { networks: ['base'] } },
    },
    confirm: true,
    metadata: { purpose: 'x402', endpoint: '/v1/x402/recommend' },
  } as unknown as Stripe.PaymentIntentCreateParams;

  const pi = await stripe.paymentIntents.create(params);
  const next = pi.next_action as unknown as {
    crypto_display_details?: { deposit_addresses?: Record<string, { address?: string }> };
  };
  const deposits = next?.crypto_display_details?.deposit_addresses;
  const payTo: string | undefined = deposits?.base?.address;
  if (!payTo) {
    throw new Error('x402: PaymentIntent did not return a Base deposit address');
  }
  return { paymentIntentId: pi.id, payTo, amountCents, network: BASE_MAINNET_CHAIN, asset: 'USDC' };
}

/**
 * The 402 challenge body, shaped like an x402 payment-requirements document.
 * `extra.paymentId` is the spike bridge: clients echo it back in X-PAYMENT.
 */
export function buildChallengeBody(ch: X402Challenge, resourceUrl: string) {
  return {
    x402Version: 1,
    error: 'payment_required',
    accepts: [
      {
        scheme: 'exact',
        network: ch.network,
        asset: ch.asset,
        maxAmountRequired: String(ch.amountCents),
        price: `$${(ch.amountCents / 100).toFixed(2)}`,
        payTo: ch.payTo,
        resource: resourceUrl,
        description: 'JackpotKeywords deep keyword recommendation (recommend-deep).',
        mimeType: 'application/json',
        // SPIKE: clients echo this in `X-PAYMENT` to identify their payment.
        extra: { paymentId: ch.paymentIntentId },
      },
    ],
  };
}

export interface PaymentProof {
  paymentIntentId: string;
}

/**
 * Parse the X-PAYMENT header. SPIKE format: either the raw PaymentIntent id
 * (`pi_...`) or base64-encoded JSON `{ "paymentIntentId": "pi_..." }`.
 * Returns null when the header is absent (→ caller issues a challenge).
 */
export function extractPaymentProof(req: Request): PaymentProof | null {
  const raw = req.headers['x-payment'];
  const header = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!header) return null;

  if (header.startsWith('pi_')) return { paymentIntentId: header };
  try {
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    const id = decoded?.paymentIntentId ?? decoded?.extra?.paymentId;
    if (typeof id === 'string' && id.startsWith('pi_')) return { paymentIntentId: id };
  } catch {
    /* fall through */
  }
  return null;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

/**
 * Verify the agent actually paid: the PaymentIntent must exist, be ours
 * (metadata.purpose === 'x402'), be captured (`succeeded`), in USD, for at
 * least the required amount. Never run paid work on an unverified proof.
 */
export async function verifyPayment(proof: PaymentProof, requiredCents: number): Promise<VerifyResult> {
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(proof.paymentIntentId);
  } catch {
    return { ok: false, reason: 'payment_not_found' };
  }
  if (pi.metadata?.purpose !== 'x402') return { ok: false, reason: 'not_an_x402_payment' };
  if (pi.currency !== 'usd') return { ok: false, reason: 'wrong_currency' };
  if (pi.status !== 'succeeded') return { ok: false, reason: `not_settled (${pi.status})` };
  if ((pi.amount_received ?? 0) < requiredCents) return { ok: false, reason: 'underpaid' };
  return { ok: true };
}

/**
 * Refund a settled PaymentIntent (failure path — the deposit model is
 * funds-first, so a failed pipeline run must return the agent's USDC).
 * Best-effort: returns whether the refund was created.
 */
export async function refundPayment(paymentIntentId: string, reason: string): Promise<boolean> {
  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      metadata: { purpose: 'x402_refund', reason: reason.slice(0, 200) },
    });
    return true;
  } catch (err) {
    functions.logger.error('x402 refund failed:', (err as Error).message);
    return false;
  }
}

export type FulfillmentClaim =
  | { ok: true }
  | { ok: false; status: 'processing' | 'fulfilled' | 'refunded' };

/**
 * Idempotency guard. Atomically claims `x402Fulfillments/{paymentIntentId}`:
 *   - first caller       → creates status:'processing', returns ok
 *   - already processing → in-flight duplicate (409)
 *   - already fulfilled  → don't re-run a paid pipeline (409)
 *   - already refunded   → that payment is spent (402, pay again)
 */
export async function claimFulfillment(paymentIntentId: string): Promise<FulfillmentClaim> {
  const ref = db.doc(`x402Fulfillments/${paymentIntentId}`);
  return db.runTransaction(async (tx): Promise<FulfillmentClaim> => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const status = (snap.data()?.status as 'processing' | 'fulfilled' | 'refunded') ?? 'processing';
      return { ok: false, status };
    }
    tx.create(ref, {
      status: 'processing',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}

/** Mark a claimed fulfillment as done (`fulfilled`) or rolled back (`refunded`). */
export async function markFulfillment(
  paymentIntentId: string,
  status: 'fulfilled' | 'refunded',
): Promise<void> {
  try {
    await db.doc(`x402Fulfillments/${paymentIntentId}`).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    /* non-fatal — observability only */
  }
}

// In-memory IP rate limiter for the x402 route (no customer to key on). Bounds
// abuse of the PaymentIntent-creation step. Per-instance, same trade-offs as
// apiRateLimit; fine for a spike.
const X402_MAX_PER_MINUTE = 20;
const ipHits = new Map<string, number[]>();

export function x402IpRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const minuteAgo = now - 60_000;
  const arr = (ipHits.get(ip) ?? []).filter((t) => t > minuteAgo);
  if (arr.length >= X402_MAX_PER_MINUTE) {
    res.status(429).set('Retry-After', '60').json({
      error: 'rate_limited',
      message: `Limit: ${X402_MAX_PER_MINUTE} requests per minute.`,
      retryAfterSeconds: 60,
    });
    return;
  }
  arr.push(now);
  ipHits.set(ip, arr);
  next();
}
