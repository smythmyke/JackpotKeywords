import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

const db = admin.firestore();

/**
 * Rate limit anonymous (unauthenticated) requests by IP address.
 * Authenticated users are not rate limited — they're gated by credits.
 *
 * Uses Firestore document per IP with a sliding window counter.
 * TTL cleanup handled by Firestore TTL policy (set expiresAt field).
 */
// Admin testing bypass — same token as anonSearchLimit.ts. Kept in both files
// (instead of a shared constant) so the bypass logic is self-contained in each
// middleware for review.
const ADMIN_BYPASS_TOKEN = 'smythmyke-dev-2026-bypass';

function hasAdminBypass(req: Request | AuthRequest): boolean {
  const raw = req.headers['x-admin-bypass'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && value.toString().trim() === ADMIN_BYPASS_TOKEN) return true;
  const qp = (req.query?.adminBypass || req.query?.admin_bypass) as string | undefined;
  if (qp && qp.trim() === ADMIN_BYPASS_TOKEN) return true;
  const bodyBypass = (req.body?.adminBypass || req.body?.admin_bypass) as string | undefined;
  if (bodyBypass && bodyBypass.trim() === ADMIN_BYPASS_TOKEN) return true;
  return false;
}

export function anonymousRateLimit(opts: {
  /** Max requests per window for anonymous users */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Collection name for rate limit docs */
  collection: string;
}) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Authenticated users bypass rate limiting
    if (req.userId) {
      next();
      return;
    }

    // Admin test bypass
    if (hasAdminBypass(req)) {
      next();
      return;
    }

    const ip = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
    const docId = ip.replace(/[.:/]/g, '_'); // Sanitize for Firestore doc ID
    const docRef = db.collection(opts.collection).doc(docId);

    try {
      const now = Date.now();
      const windowStart = now - (opts.windowSeconds * 1000);

      const result = await db.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        const data = doc.data();

        // Get existing timestamps within the window
        let timestamps: number[] = data?.timestamps || [];
        timestamps = timestamps.filter((t) => t > windowStart);

        if (timestamps.length >= opts.maxRequests) {
          return { allowed: false, remaining: 0 };
        }

        timestamps.push(now);
        tx.set(docRef, {
          timestamps,
          ip,
          expiresAt: admin.firestore.Timestamp.fromMillis(now + (opts.windowSeconds * 1000)),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { allowed: true, remaining: opts.maxRequests - timestamps.length };
      });

      if (!result.allowed) {
        functions.logger.warn(`Rate limit exceeded for IP ${ip} on ${opts.collection}`);
        res.status(429).json({
          error: 'Too many requests. Please sign in for unlimited access, or try again later.',
        });
        return;
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', opts.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      next();
    } catch (err) {
      // If rate limiting fails, allow the request (fail open)
      functions.logger.warn('Rate limit check failed, allowing request:', err);
      next();
    }
  };
}
