/**
 * Per-API-key rate limit for /v1 routes.
 *
 * In-memory sliding window keyed by apiCustomer.id. Two limits applied:
 *   - 60 requests per minute
 *   - 1000 requests per hour
 *
 * Trade-offs (acceptable for Stage-1 design-partner volume):
 *   - Per-instance, not per-cluster. If Cloud Functions scale to N warm
 *     instances, effective limit per customer becomes N × the configured
 *     number. Tolerable while traffic is low; revisit when we have >1
 *     paying customer regularly bursting near the cap.
 *   - Cold-start resets the counter. A determined caller could bypass by
 *     spreading requests across cold instances, but our function rarely
 *     cold-starts under load — the warm instance handles bursts.
 *
 * Apply AFTER apiKeyAuth in the middleware chain so req.apiCustomer is set.
 */

import type { Response, NextFunction } from 'express';
import type { ApiKeyRequest } from './apiKeyAuth';

const MAX_PER_MINUTE = 60;
const MAX_PER_HOUR = 1000;
const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

const hits = new Map<string, number[]>();

export function apiRateLimit(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction,
): void {
  const customerId = req.apiCustomer?.id;
  if (!customerId) {
    next();
    return;
  }

  const now = Date.now();
  const minuteAgo = now - ONE_MINUTE_MS;
  const hourAgo = now - ONE_HOUR_MS;

  let arr = hits.get(customerId) ?? [];
  arr = arr.filter((t) => t > hourAgo);

  const minuteCount = arr.filter((t) => t > minuteAgo).length;
  if (minuteCount >= MAX_PER_MINUTE) {
    res
      .status(429)
      .set('Retry-After', '60')
      .json({
        error: 'rate_limited',
        message: `Limit: ${MAX_PER_MINUTE} requests per minute.`,
        scope: 'minute',
        retryAfterSeconds: 60,
      });
    return;
  }

  if (arr.length >= MAX_PER_HOUR) {
    res
      .status(429)
      .set('Retry-After', '3600')
      .json({
        error: 'rate_limited',
        message: `Limit: ${MAX_PER_HOUR} requests per hour.`,
        scope: 'hour',
        retryAfterSeconds: 3600,
      });
    return;
  }

  arr.push(now);
  hits.set(customerId, arr);
  next();
}
