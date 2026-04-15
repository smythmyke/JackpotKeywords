import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

const db = admin.firestore();

const MAX_ANON_LIFETIME_SEARCHES = 3;
const COLLECTION = 'anonSearchCounts';

// Admin testing bypass. If a request carries X-Admin-Bypass matching the token
// below, skip the anon lifetime cap. Lets the admin test anon flows repeatedly
// without signing in. The token is long enough that casual probing can't guess
// it, and it only bypasses the free-tier counter — no data access escalation.
const ADMIN_BYPASS_TOKEN = 'smythmyke-dev-2026-bypass';

function hasAdminBypass(req: AuthRequest): boolean {
  const raw = req.headers['x-admin-bypass'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return !!value && value.toString().trim() === ADMIN_BYPASS_TOKEN;
}

export function anonSearchLimit() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Authenticated users bypass — gated by credits instead
    if (req.userId) {
      next();
      return;
    }

    // Admin test bypass — see ADMIN_BYPASS_TOKEN comment above
    if (hasAdminBypass(req)) {
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
