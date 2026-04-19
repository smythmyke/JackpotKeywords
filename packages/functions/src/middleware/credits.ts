import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import type { OperationType } from '@jackpotkeywords/shared';

const db = admin.firestore();

interface CreditResult {
  allowed: boolean;
  newBalance: number;
  isFreeSearch: boolean;
}

const ADMIN_EMAILS = ['smythmyke@gmail.com'];
const ADMIN_BYPASS_TOKEN = 'smythmyke-dev-2026-bypass';

/**
 * Returns true when the admin wants to preview the app as a regular free user.
 * Gated by X-Disable-Admin header (only meaningful if the caller is a real
 * admin — it just tells the server to skip all admin bypass paths on this
 * request). Non-admins setting this header see no effect, since they never
 * hit the admin branches anyway.
 */
export function isAdminDisabledRequest(req: {
  headers?: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
}): boolean {
  const raw = req.headers?.['x-disable-admin'];
  const h = Array.isArray(raw) ? raw[0] : raw;
  const q = req.query?.disableAdmin || req.query?.disable_admin;
  const b = req.body?.disableAdmin || req.body?.disable_admin;
  const match = (v: any) => v === '1' || v === 1 || v === true || v === 'true';
  return match(h) || match(q) || match(b);
}

/**
 * Checks whether the given email is a real admin AND the admin-disable toggle
 * is NOT set on this request. Use this instead of `ADMIN_EMAILS.includes(email)`
 * in any route that wants to respect the "preview as free user" toggle.
 */
export function isEffectiveAdmin(email: string | null | undefined, req: {
  headers?: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
}): boolean {
  if (!email || !ADMIN_EMAILS.includes(email)) return false;
  return !isAdminDisabledRequest(req);
}

/**
 * Helper for route handlers: returns { tokenEmail, adminBypass } options ready
 * to pass into checkAndDeductCredits. Centralises the bypass-header parsing
 * and Firebase-token email lookup so every caller gets the same admin handling.
 *
 * Respects the X-Disable-Admin toggle: when set, tokenEmail is cleared so the
 * admin-bypass path in checkAndDeductCredits is skipped and the admin is
 * treated as a regular free-plan user.
 */
export function getCreditBypassOptions(req: {
  headers: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  userEmail?: string;
}): { tokenEmail?: string; adminBypass?: boolean; disableAdmin?: boolean } {
  const raw = req.headers['x-admin-bypass'];
  const headerValue = Array.isArray(raw) ? raw[0] : raw;
  const qp = (req.query?.adminBypass || req.query?.admin_bypass) as string | undefined;
  const bodyBypass = (req.body?.adminBypass || req.body?.admin_bypass) as string | undefined;
  const headerMatch = !!headerValue && headerValue.toString().trim() === ADMIN_BYPASS_TOKEN;
  const qpMatch = !!qp && qp.trim() === ADMIN_BYPASS_TOKEN;
  const bodyMatch = !!bodyBypass && bodyBypass.trim() === ADMIN_BYPASS_TOKEN;
  const disableAdmin = isAdminDisabledRequest(req);
  return {
    tokenEmail: disableAdmin ? undefined : req.userEmail,
    adminBypass: !disableAdmin && (headerMatch || qpMatch || bodyMatch),
    disableAdmin,
  };
}

export async function checkAndDeductCredits(
  userId: string,
  creditsNeeded: number,
  operation: OperationType,
  description: string,
  options: { tokenEmail?: string; adminBypass?: boolean; disableAdmin?: boolean } = {},
): Promise<CreditResult> {
  // Short-circuit admin bypass before opening a transaction. Checks three
  // sources so we don't get stuck if the Firestore user doc is stale/missing:
  // 1. Explicit header-based bypass (admin testing while signed in)
  // 2. Firebase-token email (authoritative — set by authMiddleware)
  // 3. (Below inside the transaction) Firestore userData.email fallback
  // All three are skipped when options.disableAdmin is set so admins can
  // preview the app as a regular free user.
  if (options.adminBypass && !options.disableAdmin) {
    return { allowed: true, newBalance: 0, isFreeSearch: false };
  }
  if (!options.disableAdmin && options.tokenEmail && ADMIN_EMAILS.includes(options.tokenEmail)) {
    return { allowed: true, newBalance: 0, isFreeSearch: false };
  }

  const creditsRef = db.doc(`users/${userId}/credits/balance`);
  const transactionsRef = db.collection(`users/${userId}/transactions`);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const creditsDoc = await transaction.get(creditsRef);
      const currentData = creditsDoc.data() || {
        balance: 0,
        lifetimeUsed: 0,
        lifetimePurchased: 0,
        freeSearchesUsed: 0,
      };

      const currentBalance = currentData.balance || 0;
      const freeUsed = currentData.freeSearchesUsed || 0;
      const FREE_LIMIT = 3;

      // Check if user has a subscription (Pro/Agency)
      const userDoc = await transaction.get(db.doc(`users/${userId}`));
      const userData = userDoc.data();
      const plan = userData?.plan || 'free';
      const email = userData?.email || '';

      // Admin bypass via Firestore email (fallback if tokenEmail wasn't passed).
      // Skipped when options.disableAdmin is set (preview-as-free toggle).
      if (!options.disableAdmin && ADMIN_EMAILS.includes(email)) {
        return { allowed: true, newBalance: currentBalance, isFreeSearch: false };
      }

      // Subscribers get unlimited
      if (plan === 'pro' || plan === 'agency') {
        transaction.create(transactionsRef.doc(), {
          type: 'usage',
          amount: 0,
          description: `${description} (subscription)`,
          operationType: operation,
          timestamp: FieldValue.serverTimestamp(),
        });
        return { allowed: true, newBalance: currentBalance, isFreeSearch: false };
      }

      // Free searches available
      if (freeUsed < FREE_LIMIT) {
        transaction.set(creditsRef, {
          ...currentData,
          freeSearchesUsed: freeUsed + 1,
        }, { merge: true });

        transaction.create(transactionsRef.doc(), {
          type: 'usage',
          amount: 0,
          description: `${description} (free search ${freeUsed + 1}/${FREE_LIMIT})`,
          operationType: operation,
          timestamp: FieldValue.serverTimestamp(),
        });
        return { allowed: true, newBalance: currentBalance, isFreeSearch: true };
      }

      // Deduct credits
      if (currentBalance < creditsNeeded) {
        return { allowed: false, newBalance: currentBalance, isFreeSearch: false };
      }

      const newBalance = currentBalance - creditsNeeded;

      transaction.set(creditsRef, {
        balance: newBalance,
        lifetimeUsed: (currentData.lifetimeUsed || 0) + creditsNeeded,
      }, { merge: true });

      transaction.create(transactionsRef.doc(), {
        type: 'usage',
        amount: -creditsNeeded,
        description,
        operationType: operation,
        timestamp: FieldValue.serverTimestamp(),
      });

      return { allowed: true, newBalance, isFreeSearch: false };
    });

    return result;
  } catch (error) {
    functions.logger.error('Credit deduction error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process credits');
  }
}

export async function refundCredits(
  userId: string,
  credits: number,
  reason: string,
): Promise<number> {
  const creditsRef = db.doc(`users/${userId}/credits/balance`);
  const transactionsRef = db.collection(`users/${userId}/transactions`);

  const result = await db.runTransaction(async (transaction) => {
    const creditsDoc = await transaction.get(creditsRef);
    const currentData = creditsDoc.data() || { balance: 0 };
    const newBalance = (currentData.balance || 0) + credits;

    transaction.set(creditsRef, { balance: newBalance }, { merge: true });

    transaction.create(transactionsRef.doc(), {
      type: 'refund',
      amount: credits,
      description: `Refund: ${reason}`,
      timestamp: FieldValue.serverTimestamp(),
    });

    return newBalance;
  });

  return result;
}
