import { Router } from 'express';
import * as functions from 'firebase-functions';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { getSearchAnalytics } from '../services/searchConsole';

const router = Router();

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

/**
 * GET /api/admin/search-console?days=7&dimension=query
 * Returns Search Console analytics data. Admin-only.
 */
router.get('/search-console', authMiddleware, async (req: AuthRequest, res) => {
  const email = req.userEmail || '';
  if (!ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const days = Math.min(Number(req.query.days) || 7, 90);
  const dimension = (req.query.dimension as string) || 'query';

  if (!['query', 'page'].includes(dimension)) {
    res.status(400).json({ error: 'dimension must be "query" or "page"' });
    return;
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // SC data lags ~2 days
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  try {
    const result = await getSearchAnalytics(fmt(startDate), fmt(endDate), [dimension]);
    res.json({
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimension,
      ...result,
    });
  } catch (err: any) {
    functions.logger.error('Admin search-console error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
