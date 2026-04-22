import { Router } from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { getSearchAnalytics } from '../services/searchConsole';

const router = Router();
const db = admin.firestore();

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

/**
 * GET /api/admin/stats
 * Aggregate user + credit + transaction counts for the JK dashboard.
 * Auth: x-admin-key header must match ADMIN_API_KEY env var (shared secret
 * for trusted admin tools — the dashboard isn't a Firebase-authenticated user).
 */
router.get('/stats', async (req, res) => {
  const providedKey = String(req.headers['x-admin-key'] || '').trim();
  const expectedKey = (process.env.ADMIN_API_KEY || '').trim();
  if (!expectedKey || providedKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const usersSnap = await db.collection('users').get();
    const totalUsers = usersSnap.size;
    const planCounts: Record<string, number> = {};
    usersSnap.forEach(doc => {
      const plan = (doc.data().plan as string) || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });

    // Aggregate credit balances across all users
    let lifetimePurchased = 0;
    let currentBalance = 0;
    const creditsSnap = await db.collectionGroup('credits').get();
    creditsSnap.forEach(doc => {
      // Only count the per-user "balance" doc (path ends users/{uid}/credits/balance)
      if (doc.id !== 'balance') return;
      const d = doc.data();
      lifetimePurchased += Number(d.lifetimePurchased || 0);
      currentBalance += Number(d.balance || 0);
    });
    const lifetimeUsed = Math.max(0, lifetimePurchased - currentBalance);

    // Recent purchase transactions — collection group query requires index
    // enablement that isn't set up for JK's "transactions" collection. Wrap in
    // try/catch so stats don't break if the query fails; leave empty list.
    let recentPurchases: any[] = [];
    try {
      const txSnap = await db.collectionGroup('transactions')
        .where('type', '==', 'purchase')
        .get();
      const allPurchases: any[] = [];
      txSnap.forEach(doc => {
        const d = doc.data();
        const userId = doc.ref.parent.parent?.id || '';
        const ts = d.timestamp && d.timestamp.toDate ? d.timestamp.toDate().toISOString() : null;
        allPurchases.push({
          userId,
          credits: d.amount,
          description: d.description,
          stripeSessionId: d.stripeSessionId,
          timestamp: ts,
        });
      });
      allPurchases.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
      recentPurchases = allPurchases.slice(0, 20);
    } catch (txErr: any) {
      functions.logger.warn('Admin stats: skipping recentPurchases (index not enabled):', txErr.message);
    }

    res.json({
      totalUsers,
      planCounts,
      lifetimeCreditsPurchased: lifetimePurchased,
      currentCreditsBalance: currentBalance,
      lifetimeCreditsUsed: lifetimeUsed,
      recentPurchases,
      fetched_at: new Date().toISOString(),
    });
  } catch (err: any) {
    functions.logger.error('Admin stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
