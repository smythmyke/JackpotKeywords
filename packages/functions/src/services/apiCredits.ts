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
 *                                 timestamp }
 *   apiTransactions/{txId}    — { customerId, type, amountCents, description,
 *                                 stripeSessionId, timestamp }
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

export const SIGNUP_CREDIT_CENTS = 500;     // $5.00 free signup credit
export const MIN_TOPUP_CENTS = 2500;        // $25.00 minimum top-up
export const AEO_SCAN_COST_CENTS = 100;     // $1.00 per /v1/aeo-scan
export const RECOMMEND_COST_CENTS = 10;     // $0.10 per /v1/recommend (1B)
export const SCORE_COST_PER_KW_HUNDREDTHS = 50;  // $0.005 per keyword = 50 hundredths of a cent (1B)

export const TOPUP_PACKS = [
  { id: 'starter', label: '$25', amountCents: 2500 },
  { id: 'growth',  label: '$100', amountCents: 10000 },
  { id: 'scale',   label: '$500', amountCents: 50000 },
] as const;

export interface ApiCustomer {
  id: string;
  email: string;
  balanceCents: number;
  lifetimeDepositedCents: number;
  stripeCustomerId?: string;
  createdAt: string;
}

export interface ApiKeyRecord {
  customerId: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
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
 * Create a new API customer with $5 free signup credit and a fresh API key.
 * Returns the raw key (shown to user once) and customer record.
 *
 * Idempotency: if a customer with this email already exists, returns the
 * existing customer and a NEW key (so re-signups can recover access without
 * burning the signup credit again).
 */
export async function createApiCustomer(email: string): Promise<{
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
  } else {
    customerId = db.collection('apiCustomers').doc().id;
    customer = {
      id: customerId,
      email: normalizedEmail,
      balanceCents: SIGNUP_CREDIT_CENTS,
      lifetimeDepositedCents: 0,
      createdAt: new Date().toISOString(),
    };
    await db.doc(`apiCustomers/${customerId}`).set({
      email: customer.email,
      balanceCents: customer.balanceCents,
      lifetimeDepositedCents: 0,
      createdAt: customer.createdAt,
    });
    await db.collection('apiTransactions').add({
      customerId,
      type: 'signup_credit',
      amountCents: SIGNUP_CREDIT_CENTS,
      description: 'Welcome credit — $5.00',
      timestamp: FieldValue.serverTimestamp(),
    });
    newSignup = true;
  }

  // Always issue a fresh key on signup call (including re-signups)
  const { raw, hash } = generateApiKey();
  await db.doc(`apiKeys/${hash}`).set({
    customerId,
    name: 'default',
    createdAt: new Date().toISOString(),
    revoked: false,
  });

  return { customer, apiKey: raw, newSignup };
}

/**
 * Deduct cost from balance and log the call. Transactional — refuses if balance
 * insufficient. Returns new balance.
 */
export async function deductBalance(
  customerId: string,
  costCents: number,
  endpoint: string,
): Promise<number> {
  const customerRef = db.doc(`apiCustomers/${customerId}`);
  const newBalance = await db.runTransaction(async (tx) => {
    const snap = await tx.get(customerRef);
    if (!snap.exists) throw new Error('Customer not found');
    const data = snap.data() as ApiCustomer;
    if (data.balanceCents < costCents) {
      throw new Error(`Insufficient balance: have ${data.balanceCents} cents, need ${costCents}`);
    }
    const next = data.balanceCents - costCents;
    tx.update(customerRef, { balanceCents: next });
    tx.create(db.collection('apiCalls').doc(), {
      customerId,
      endpoint,
      costCents,
      ok: true,
      timestamp: FieldValue.serverTimestamp(),
    });
    return next;
  });
  return newBalance;
}

/**
 * Refund a previously-deducted cost (used when the endpoint errors after deduction).
 * Logs the refund as a separate transaction.
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
      timestamp: FieldValue.serverTimestamp(),
    });
  });
}
