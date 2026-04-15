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
 * Helper for route handlers: returns { tokenEmail, adminBypass } options ready
 * to pass into checkAndDeductCredits. Centralises the bypass-header parsing
 * and Firebase-token email lookup so every caller gets the same admin handling.
 */
export function getCreditBypassOptions(req: {
  headers: Record<string, any>;
  userEmail?: string;
}): { tokenEmail?: string; adminBypass?: boolean } {
  const raw = req.headers['x-admin-bypass'];
  const bypassValue = Array.isArray(raw) ? raw[0] : raw;
  const adminBypass = !!bypassValue && bypassValue.toString().trim() === ADMIN_BYPASS_TOKEN;
  return {
    tokenEmail: req.userEmail,
    adminBypass,
  };
}

export async function checkAndDeductCredits(
  userId: string,
  creditsNeeded: number,
  operation: OperationType,
  description: string,
  options: { tokenEmail?: string; adminBypass?: boolean } = {},
): Promise<CreditResult> {
  // Short-circuit admin bypass before opening a transaction. Checks three
  // sources so we don't get stuck if the Firestore user doc is stale/missing:
  // 1. Explicit header-based bypass (admin testing while signed in)
  // 2. Firebase-token email (authoritative — set by authMiddleware)
  // 3. (Below inside the transaction) Firestore userData.email fallback
  if (options.adminBypass) {
    return { allowed: true, newBalance: 0, isFreeSearch: false };
  }
  if (options.tokenEmail && ADMIN_EMAILS.includes(options.tokenEmail)) {
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

      // Admin bypass via Firestore email (fallback if tokenEmail wasn't passed)
      if (ADMIN_EMAILS.includes(email)) {
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
