import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

const db = admin.firestore();

const MAX_ANON_LIFETIME_SEARCHES = 3;
const COLLECTION = 'anonSearchCounts';

export function anonSearchLimit() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Authenticated users bypass — gated by credits instead
    if (req.userId) {
      next();
      return;
    }

    const anonId = req.anonId;
    if (!anonId) {
      // No anon_id header — fall through to IP safety net
      next();
      return;
    }

    const docRef = db.collection(COLLECTION).doc(anonId);

    try {
      const result = await db.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        const count = (doc.data()?.count as number) || 0;
        if (count >= MAX_ANON_LIFETIME_SEARCHES) {
          return { allowed: false, count };
        }
        tx.set(
          docRef,
          {
            count: count + 1,
            firstSearchAt: doc.exists ? doc.data()?.firstSearchAt : admin.firestore.FieldValue.serverTimestamp(),
            lastSearchAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        return { allowed: true, count: count + 1 };
      });

      if (!result.allowed) {
        res.status(402).json({
          error: 'Free search limit reached',
          reason: 'anon_searches_exhausted',
          limit: MAX_ANON_LIFETIME_SEARCHES,
        });
        return;
      }

      res.setHeader('X-Anon-Searches-Used', result.count);
      res.setHeader('X-Anon-Searches-Limit', MAX_ANON_LIFETIME_SEARCHES);
      next();
    } catch (err) {
      functions.logger.warn('Anon search limit check failed, allowing request:', err);
      next();
    }
  };
}

export async function refundAnonSearch(anonId: string): Promise<void> {
  if (!anonId) return;
  const docRef = db.collection(COLLECTION).doc(anonId);
  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      const count = (doc.data()?.count as number) || 0;
      if (count > 0) {
        tx.update(docRef, { count: count - 1 });
      }
    });
  } catch (err) {
    functions.logger.warn('Anon search refund failed:', err);
  }
}
