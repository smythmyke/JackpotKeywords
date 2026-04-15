import { Router } from 'express';
import * as admin from 'firebase-admin';
import { optionalAuthMiddleware, type AuthRequest } from '../middleware/auth';

const router = Router();
const db = admin.firestore();

const ALLOWED_EVENTS = new Set([
  'paywall_viewed',
  'upgrade_clicked',
  'signin_prompted',
  'signin_completed',
  'anon_search_completed',
  'checkout_started',
]);

const MAX_DETAIL_STR = 200;

function sanitizeDetails(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.length > 64) continue;
    if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_DETAIL_STR);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    }
  }
  return out;
}

router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const { event, details } = req.body || {};
  if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event)) {
    res.status(400).json({ error: 'Invalid event' });
    return;
  }

  try {
    await db.collection('activityLog').add({
      action: event,
      userId: req.userId || 'anonymous',
      anonId: req.anonId || null,
      ...sanitizeDetails(details),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to log event' });
  }
});

export default router;
