import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import type { OperationType } from '@jackpotkeywords/shared';

const db = admin.firestore();

interface CreditResult {
  allowed: boolean;
  newBalance: number;
  isFreeSearch: boolean;
}

export async function checkAndDeductCredits(
  userId: string,
  creditsNeeded: number,
  operation: OperationType,
  description: string,
): Promise<CreditResult> {
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

      // Subscribers get unlimited
      if (plan === 'pro' || plan === 'agency') {
        transaction.create(transactionsRef.doc(), {
          type: 'usage',
          amount: 0,
          description: `${description} (subscription)`,
          operationType: operation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return newBalance;
  });

  return result;
}
