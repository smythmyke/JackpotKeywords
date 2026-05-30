/**
 * Monthly FREE quota for the OpenAI/ChatGPT discovery surface.
 *
 * The ChatGPT app cannot sell credits (OpenAI policy — see
 * docs/api-deployment/OPENAI-APPS-SDK-PLAN-2026-05-29.md §1), so the free tier
 * is metered as a per-customer monthly call counter rather than against the
 * `balanceCents` wallet. One full `recommend` report per customer per month.
 *
 * This is deliberately SEPARATE from apiCredits/deductBalance: the free path
 * never touches the paid balance, and a paying customer's balance is never
 * inflated by a free grant.
 *
 * Firestore:
 *   apiFreeQuota/{customerId} — { month: 'YYYY-MM', count, updatedAt }
 *   apiFreeQuota/_global      — { month: 'YYYY-MM', count, updatedAt }  (abuse/cost backstop)
 *   apiCalls/{id}             — free calls logged with costCents:0, free:true for analytics
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

export const FREE_RECOMMENDS_PER_MONTH = 1;

// Hard backstop across ALL free customers in a calendar month — a cost/abuse
// ceiling, not a per-user limit. Override via env if the surface takes off.
const GLOBAL_FREE_CAP = parseInt(process.env.JK_MCP_GLOBAL_FREE_CAP || '5000', 10);

const GLOBAL_DOC_ID = '_global';

/** UTC month bucket, e.g. "2026-05". */
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** ISO date (YYYY-MM-DD) of the first day of next month, UTC. */
function nextMonthResetISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const next = new Date(Date.UTC(m === 11 ? y + 1 : y, (m + 1) % 12, 1));
  return next.toISOString().slice(0, 10);
}

export interface FreeQuotaStatus {
  used: number;
  remaining: number;
  limit: number;
  /** YYYY-MM-DD the monthly allowance resets. */
  resetsOn: string;
}

function statusFor(used: number, resetsOn: string): FreeQuotaStatus {
  return {
    used,
    remaining: Math.max(0, FREE_RECOMMENDS_PER_MONTH - used),
    limit: FREE_RECOMMENDS_PER_MONTH,
    resetsOn,
  };
}

/** Read-only view of a customer's remaining free allowance this month. */
export async function getFreeQuotaStatus(customerId: string): Promise<FreeQuotaStatus> {
  const now = new Date();
  const mk = monthKey(now);
  const snap = await db.doc(`apiFreeQuota/${customerId}`).get();
  const data = snap.data();
  const used = data && data.month === mk ? data.count || 0 : 0;
  return statusFor(used, nextMonthResetISO(now));
}

export interface ConsumeResult {
  allowed: boolean;
  reason?: 'monthly_limit' | 'global_cap';
  status: FreeQuotaStatus;
}

/**
 * Atomically consume one free recommend for the month. Resets automatically
 * when the stored month is stale. Enforces the per-customer limit and the
 * global backstop in a single transaction. Refund with refundFreeRecommend if
 * the work the credit paid for then fails.
 */
export async function consumeFreeRecommend(customerId: string): Promise<ConsumeResult> {
  const now = new Date();
  const mk = monthKey(now);
  const resetsOn = nextMonthResetISO(now);
  const custRef = db.doc(`apiFreeQuota/${customerId}`);
  const globalRef = db.doc(`apiFreeQuota/${GLOBAL_DOC_ID}`);

  return db.runTransaction(async (tx) => {
    const [cSnap, gSnap] = await Promise.all([tx.get(custRef), tx.get(globalRef)]);
    const c = cSnap.data();
    const g = gSnap.data();
    const cUsed = c && c.month === mk ? c.count || 0 : 0;
    const gUsed = g && g.month === mk ? g.count || 0 : 0;

    if (cUsed >= FREE_RECOMMENDS_PER_MONTH) {
      return { allowed: false, reason: 'monthly_limit', status: statusFor(cUsed, resetsOn) };
    }
    if (gUsed >= GLOBAL_FREE_CAP) {
      return { allowed: false, reason: 'global_cap', status: statusFor(cUsed, resetsOn) };
    }

    // set (not merge of count) so a stale month resets the counter to 1.
    tx.set(custRef, { month: mk, count: cUsed + 1, updatedAt: FieldValue.serverTimestamp() });
    tx.set(globalRef, { month: mk, count: gUsed + 1, updatedAt: FieldValue.serverTimestamp() });
    return { allowed: true, status: statusFor(cUsed + 1, resetsOn) };
  });
}

/**
 * Give back one consumed free recommend (e.g. the pipeline failed after we
 * consumed the allowance). No-op if the month rolled over or count is already 0.
 */
export async function refundFreeRecommend(customerId: string): Promise<void> {
  const now = new Date();
  const mk = monthKey(now);
  const custRef = db.doc(`apiFreeQuota/${customerId}`);
  const globalRef = db.doc(`apiFreeQuota/${GLOBAL_DOC_ID}`);
  await db.runTransaction(async (tx) => {
    const [cSnap, gSnap] = await Promise.all([tx.get(custRef), tx.get(globalRef)]);
    const c = cSnap.data();
    if (c && c.month === mk && (c.count || 0) > 0) {
      tx.update(custRef, { count: c.count - 1, updatedAt: FieldValue.serverTimestamp() });
    }
    const g = gSnap.data();
    if (g && g.month === mk && (g.count || 0) > 0) {
      tx.update(globalRef, { count: g.count - 1, updatedAt: FieldValue.serverTimestamp() });
    }
  });
}

/**
 * Log a successful free recommend to apiCalls for surface analytics. Mirrors
 * the shape deductBalance writes (costCents:0, free:true) so the usage analyze
 * script can include/exclude free traffic. Non-fatal.
 */
export async function recordFreeRecommendCall(
  customerId: string,
  latencyMs: number,
  resultCount: number,
): Promise<void> {
  try {
    await db.collection('apiCalls').add({
      customerId,
      endpoint: '/mcp/recommend',
      costCents: 0,
      ok: true,
      free: true,
      source: 'mcp', // ApiSource enum is still binary; openai buckets as mcp (deferred to-do #1)
      surface: 'openai',
      latencyMs,
      resultCount,
      timestamp: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    });
  } catch {
    /* non-fatal — analytics must not break the user request */
  }
}
