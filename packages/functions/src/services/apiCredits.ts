/**
 * API customer + credit balance management.
 *
 * Separate from the consumer-app credit system. API customers are identified
 * by API key (Bearer token), have a balance stored in USD cents, and pay per
 * call (deducted server-side).
 *
 * Firestore schema:
 *   apiCustomers/{customerId} — { email, balanceCents, lifetimeDepositedCents,
 *                                 stripeCustomerId, createdAt }
 *   apiKeys/{sha256Hash}      — { customerId, name, createdAt, lastUsedAt,
 *                                 revoked }   doc ID = sha256(key) for O(1) lookup
 *   apiCalls/{callId}         — { customerId, endpoint, costCents, ok, errCode,
 *                                 latencyMs, resultCount, timestamp,
 *                                 completedAt }
 *                                 — Created at deduct time with ok:true and no
 *                                 latency. Updated at handler completion (success
 *                                 OR failure) with latencyMs + completedAt and,
 *                                 on failure, ok:false + errCode + refunded:true.
 *   apiTransactions/{txId}    — { customerId, type, amountCents, description,
 *                                 stripeSessionId, timestamp }
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

export const SIGNUP_CREDIT_CENTS = 200;     // $2.00 starter credit — sized to 2 AEO scans / 20 recommends
export const MIN_TOPUP_CENTS = 500;         // $5.00 minimum top-up
export const AEO_SCAN_COST_CENTS = 100;     // $1.00 per /v1/aeo-scan
export const RECOMMEND_COST_CENTS = 10;     // $0.10 per /v1/recommend (1B)
export const RECOMMEND_DEEP_COST_CENTS = 30; // $0.30 per /v1/recommend-deep — adds competitor discovery + clusters + categories
export const AUDIT_COST_CENTS = 50;          // $0.50 per /v1/audit — SEO-only (AEO sold separately via /v1/aeo-scan)
export const SCORE_COST_PER_KW_HUNDREDTHS = 50;  // $0.005 per keyword = 50 hundredths of a cent (1B)

/**
 * Per-operation cost lookup, keyed by the endpoint slug used by the async job
 * layer (POST /v1/jobs). Lets the job initiator do a fast balance pre-check
 * before enqueueing — the actual deduction still happens when the worker calls
 * the matching sync endpoint, so this stays a convenience, not a second source
 * of truth.
 */
export const OPERATION_COST_CENTS: Readonly<Record<string, number>> = {
  recommend: RECOMMEND_COST_CENTS,
  'recommend-deep': RECOMMEND_DEEP_COST_CENTS,
  'aeo-scan': AEO_SCAN_COST_CENTS,
  audit: AUDIT_COST_CENTS,
};

/**
 * Emails that get unlimited free API use. Same pattern as the consumer-app
 * admin bypass for smythmyke@gmail.com. Calls still get logged to apiCalls
 * with `admin: true` so usage stats stay accurate and the analyze script
 * can filter admin traffic out of revenue totals.
 */
const ADMIN_EMAILS = new Set(['smythmyke@gmail.com']);

export function isAdminApiCustomer(customer: { email: string } | null | undefined): boolean {
  if (!customer?.email) return false;
  return ADMIN_EMAILS.has(customer.email.toLowerCase().trim());
}

/**
 * Whether a customer's calls skip balance deduction. True for admins (free
 * internal use) and for the RapidAPI "house" account, where RapidAPI is the
 * ledger — it meters + bills its own subscribers, so JK must not also deduct.
 * Calls are still logged to apiCalls either way. Use this (not isAdmin) for the
 * per-endpoint balance pre-checks so the house account isn't 402'd on $0.
 */
export function isBillingExemptApiCustomer(
  customer: { email: string; billingExempt?: boolean } | null | undefined,
): boolean {
  if (!customer) return false;
  return isAdminApiCustomer(customer) || customer.billingExempt === true;
}

export const TOPUP_PACKS = [
  { id: 'mini',    label: '$5', amountCents: 500 },
  { id: 'starter', label: '$25', amountCents: 2500 },
  { id: 'growth',  label: '$100', amountCents: 10000 },
  { id: 'scale',   label: '$500', amountCents: 50000 },
] as const;

/**
 * Which surface a request came from. 'mcp' = the published MCP server, 'api' =
 * direct calls (incl. n8n/Zapier), 'rapidapi' = proxied through the RapidAPI
 * gateway (the house account; RapidAPI owns billing), 'x402' = anonymous
 * agent-to-agent pay-per-call settled in USDC (no customer, no prepaid balance;
 * Stripe is the ledger via a crypto PaymentIntent). 'mcp'/'api' share the same
 * Bearer jk_live_<key> auth + JK billing; 'rapidapi' and 'x402' do not deduct a
 * JK balance. Used for the seller dashboard's attribution rollups.
 */
export type ApiSource = 'mcp' | 'api' | 'rapidapi' | 'x402';

export const API_SOURCES: ReadonlySet<ApiSource> = new Set(['mcp', 'api', 'rapidapi', 'x402']);

/** Validate an arbitrary value against ApiSource, defaulting to "api". */
export function coerceApiSource(value: unknown): ApiSource {
  return typeof value === 'string' && API_SOURCES.has(value as ApiSource)
    ? (value as ApiSource)
    : 'api';
}

export interface ApiCustomer {
  id: string;
  email: string;
  balanceCents: number;
  lifetimeDepositedCents: number;
  stripeCustomerId?: string;
  createdAt: string;
  /** First-touch surface that triggered customer creation. Never overwritten. */
  signupSource?: ApiSource;
  /**
   * When true, this customer's calls skip balance deduction (calls are still
   * logged). Set on the single RapidAPI "house" account, where RapidAPI is the
   * ledger. Distinct from admin so RapidAPI revenue stays visible in attribution.
   */
  billingExempt?: boolean;
}

export interface ApiKeyRecord {
  customerId: string;
  name: string;
  /**
   * First 16 chars of the raw key (e.g. "jk_live_433e94ce"). Safe to display —
   * not enough entropy to brute-force. Lets listKeysForCustomer disambiguate
   * keys without exposing the secret.
   */
  prefix?: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
  revokedAt?: string;
}

export function generateApiKey(): { raw: string; hash: string } {
  const random = crypto.randomBytes(32).toString('hex');
  const raw = `jk_live_${random}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Look up customer by raw API key. Returns null if key invalid or revoked.
 * Updates lastUsedAt as a side effect (best-effort, non-fatal).
 */
export async function getCustomerByApiKey(rawKey: string): Promise<ApiCustomer | null> {
  if (!rawKey.startsWith('jk_live_')) return null;
  const hash = hashApiKey(rawKey);
  const keyDoc = await db.doc(`apiKeys/${hash}`).get();
  if (!keyDoc.exists) return null;
  const keyData = keyDoc.data() as ApiKeyRecord;
  if (keyData.revoked) return null;

  const customerDoc = await db.doc(`apiCustomers/${keyData.customerId}`).get();
  if (!customerDoc.exists) return null;

  // Update lastUsedAt without blocking
  db.doc(`apiKeys/${hash}`)
    .update({ lastUsedAt: new Date().toISOString() })
    .catch(() => { /* non-fatal */ });

  return { id: customerDoc.id, ...(customerDoc.data() as Omit<ApiCustomer, 'id'>) };
}

/**
 * Look up a customer directly by their document id. Used by the async job
 * worker, which authenticates internally (shared secret + customer id) rather
 * than by raw API key. Returns null if the customer doesn't exist.
 */
export async function getApiCustomerById(customerId: string): Promise<ApiCustomer | null> {
  if (!customerId) return null;
  const doc = await db.doc(`apiCustomers/${customerId}`).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<ApiCustomer, 'id'>) };
}

/**
 * Create a new API customer with $5 free signup credit and a fresh API key.
 * Returns the raw key (shown to user once) and customer record.
 *
 * Idempotency: if a customer with this email already exists, returns the
 * existing customer and a NEW key (so re-signups can recover access without
 * burning the signup credit again).
 */
export async function createApiCustomer(
  email: string,
  signupSource?: ApiSource,
): Promise<{
  customer: ApiCustomer;
  apiKey: string;
  newSignup: boolean;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db.collection('apiCustomers')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  let customerId: string;
  let customer: ApiCustomer;
  let newSignup: boolean;

  if (!existing.empty) {
    const doc = existing.docs[0];
    customerId = doc.id;
    customer = { id: doc.id, ...(doc.data() as Omit<ApiCustomer, 'id'>) };
    newSignup = false;
    // Backfill signupSource on legacy docs that pre-date this field.
    // First-touch wins — never overwrite once stamped.
    if (signupSource && !customer.signupSource) {
      await db.doc(`apiCustomers/${customerId}`).update({ signupSource });
      customer.signupSource = signupSource;
    }
  } else {
    customerId = db.collection('apiCustomers').doc().id;
    customer = {
      id: customerId,
      email: normalizedEmail,
      balanceCents: SIGNUP_CREDIT_CENTS,
      lifetimeDepositedCents: 0,
      createdAt: new Date().toISOString(),
      ...(signupSource ? { signupSource } : {}),
    };
    await db.doc(`apiCustomers/${customerId}`).set({
      email: customer.email,
      balanceCents: customer.balanceCents,
      lifetimeDepositedCents: 0,
      createdAt: customer.createdAt,
      ...(signupSource ? { signupSource } : {}),
    });
    if (SIGNUP_CREDIT_CENTS > 0) {
      await db.collection('apiTransactions').add({
        customerId,
        type: 'signup_credit',
        amountCents: SIGNUP_CREDIT_CENTS,
        description: `Welcome credit — $${(SIGNUP_CREDIT_CENTS / 100).toFixed(2)}`,
        ...(signupSource ? { source: signupSource } : {}),
        timestamp: FieldValue.serverTimestamp(),
      });
    }
    newSignup = true;
  }

  // Always issue a fresh key on signup call (including re-signups)
  const { raw, hash } = generateApiKey();
  await db.doc(`apiKeys/${hash}`).set({
    customerId,
    name: 'default',
    prefix: raw.slice(0, 16),
    createdAt: new Date().toISOString(),
    revoked: false,
  });

  return { customer, apiKey: raw, newSignup };
}

/**
 * Create a new API key for an existing customer. Returns the raw key once —
 * caller must show it to the user immediately; we never store the raw value.
 */
export async function createApiKeyForCustomer(
  customerId: string,
  name: string,
): Promise<{ apiKey: string; keyId: string; prefix: string; name: string; createdAt: string }> {
  const { raw, hash } = generateApiKey();
  const prefix = raw.slice(0, 16);
  const createdAt = new Date().toISOString();
  const safeName = (name || 'unnamed').slice(0, 64);
  await db.doc(`apiKeys/${hash}`).set({
    customerId,
    name: safeName,
    prefix,
    createdAt,
    revoked: false,
  });
  return { apiKey: raw, keyId: hash, prefix, name: safeName, createdAt };
}

/**
 * List active (non-revoked) keys for a customer. Returns only safe-to-display
 * fields — never the raw key or full hash secret. keyId is the sha256 hash
 * used as the doc ID, exposed so customers can target a specific key for
 * deletion.
 */
export async function listKeysForCustomer(customerId: string): Promise<Array<{
  keyId: string;
  name: string;
  prefix?: string;
  createdAt: string;
  lastUsedAt?: string;
}>> {
  const snap = await db.collection('apiKeys')
    .where('customerId', '==', customerId)
    .where('revoked', '==', false)
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data() as ApiKeyRecord;
    return {
      keyId: doc.id,
      name: d.name,
      prefix: d.prefix,
      createdAt: d.createdAt,
      lastUsedAt: d.lastUsedAt,
    };
  });
}

/**
 * Revoke a key. Soft-delete (sets revoked=true) so the audit trail in apiCalls
 * stays joinable. Verifies ownership before revoking — a customer can't kill
 * another customer's key even if they guess the hash.
 */
export async function revokeApiKey(
  customerId: string,
  keyId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const ref = db.doc(`apiKeys/${keyId}`);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, reason: 'key_not_found' };
  const data = doc.data() as ApiKeyRecord;
  if (data.customerId !== customerId) return { ok: false, reason: 'not_your_key' };
  if (data.revoked) return { ok: false, reason: 'already_revoked' };
  await ref.update({ revoked: true, revokedAt: new Date().toISOString() });
  return { ok: true };
}

/**
 * Deduct cost from balance and log the call. Transactional — refuses if balance
 * insufficient. Returns the new balance and the call's doc ID so the handler can
 * later call recordApiCallResult to attach latency / errCode / etc.
 *
 * Admin bypass: customers in ADMIN_EMAILS skip the balance check and deduction
 * entirely. Their calls still get logged to apiCalls with `admin: true` so the
 * usage analyze script can filter admin traffic out of revenue / reversibility
 * samples.
 */
export async function deductBalance(
  customerId: string,
  costCents: number,
  endpoint: string,
  source?: ApiSource,
): Promise<{ newBalance: number; callId: string }> {
  const customerRef = db.doc(`apiCustomers/${customerId}`);
  const callRef = db.collection('apiCalls').doc();
  const newBalance = await db.runTransaction(async (tx) => {
    const snap = await tx.get(customerRef);
    if (!snap.exists) throw new Error('Customer not found');
    const data = snap.data() as ApiCustomer;
    const isAdmin = ADMIN_EMAILS.has(data.email);
    // RapidAPI house account is billing-exempt (RapidAPI is the ledger) but is
    // NOT admin — so it skips deduction here yet stays out of the admin filter.
    const isExempt = isAdmin || data.billingExempt === true;

    let nextBalance = data.balanceCents;
    if (!isExempt) {
      if (data.balanceCents < costCents) {
        throw new Error(`Insufficient balance: have ${data.balanceCents} cents, need ${costCents}`);
      }
      nextBalance = data.balanceCents - costCents;
      tx.update(customerRef, { balanceCents: nextBalance });
    }

    tx.create(callRef, {
      customerId,
      endpoint,
      costCents,           // record the would-be cost for breakdown
      ok: true,
      ...(isAdmin ? { admin: true } : {}),
      ...(source ? { source } : {}),
      timestamp: FieldValue.serverTimestamp(),
    });
    return nextBalance;
  });
  return { newBalance, callId: callRef.id };
}

/**
 * Log an x402 (agent-to-agent) call to the same `apiCalls` ledger the keyed
 * surfaces use, so usage/revenue rollups see it. x402 has no customer and no
 * prepaid balance — settlement is the Stripe crypto PaymentIntent, recorded as
 * `settlementRef` — so this does NOT touch any balance (cf. deductBalance).
 * Returns the call's doc id so the handler can later attach latency/result via
 * recordApiCallResult, exactly like the keyed paths.
 */
export async function recordX402Call(params: {
  endpoint: string;
  costCents: number;
  settlementRef: string;
}): Promise<{ callId: string }> {
  const callRef = db.collection('apiCalls').doc();
  await callRef.create({
    endpoint: params.endpoint,
    costCents: params.costCents,
    ok: true,
    source: 'x402' as ApiSource,
    settlementRef: params.settlementRef,
    timestamp: FieldValue.serverTimestamp(),
  });
  return { callId: callRef.id };
}

/**
 * Attach result metadata to an apiCalls doc after the handler completes.
 * Called from both success and failure paths so per-endpoint latency and
 * error rate are queryable from the same collection. Non-fatal — a tracking
 * write failure must not break the user's request.
 */
export async function recordApiCallResult(
  callId: string,
  result: {
    ok: boolean;
    latencyMs: number;
    errCode?: string;
    resultCount?: number;
    refunded?: boolean;
  },
): Promise<void> {
  try {
    const patch: Record<string, unknown> = {
      ok: result.ok,
      latencyMs: result.latencyMs,
      completedAt: FieldValue.serverTimestamp(),
    };
    if (result.errCode) patch.errCode = result.errCode;
    if (typeof result.resultCount === 'number') patch.resultCount = result.resultCount;
    if (result.refunded) patch.refunded = true;
    await db.doc(`apiCalls/${callId}`).update(patch);
  } catch {
    /* non-fatal — observability must not break the user request */
  }
}

/**
 * Refund a previously-deducted cost (used when the endpoint errors after deduction).
 * Logs the refund as a separate transaction.
 *
 * Admin bypass: admin customers were never billed, so refundBalance is a no-op
 * for them. Returning early avoids a misleading transaction log entry.
 */
export async function refundBalance(
  customerId: string,
  costCents: number,
  reason: string,
): Promise<void> {
  const customerRef = db.doc(`apiCustomers/${customerId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(customerRef);
    if (!snap.exists) return;
    const data = snap.data() as ApiCustomer;
    if (ADMIN_EMAILS.has(data.email)) return; // admin wasn't billed; nothing to refund
    tx.update(customerRef, { balanceCents: data.balanceCents + costCents });
    tx.create(db.collection('apiTransactions').doc(), {
      customerId,
      type: 'refund',
      amountCents: costCents,
      description: reason,
      timestamp: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Credit a customer's balance after a successful Stripe top-up.
 * Idempotent on stripeSessionId — refuses to double-credit the same session.
 */
export async function creditTopup(
  customerId: string,
  amountCents: number,
  stripeSessionId: string,
  source?: ApiSource,
): Promise<void> {
  const customerRef = db.doc(`apiCustomers/${customerId}`);
  const txQuery = await db.collection('apiTransactions')
    .where('stripeSessionId', '==', stripeSessionId)
    .limit(1)
    .get();
  if (!txQuery.empty) return; // already processed

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(customerRef);
    if (!snap.exists) throw new Error('Customer not found');
    const data = snap.data() as ApiCustomer;
    tx.update(customerRef, {
      balanceCents: data.balanceCents + amountCents,
      lifetimeDepositedCents: (data.lifetimeDepositedCents || 0) + amountCents,
    });
    tx.create(db.collection('apiTransactions').doc(), {
      customerId,
      type: 'topup',
      amountCents,
      description: `Top-up: $${(amountCents / 100).toFixed(2)}`,
      stripeSessionId,
      ...(source ? { source } : {}),
      timestamp: FieldValue.serverTimestamp(),
    });
  });
}
