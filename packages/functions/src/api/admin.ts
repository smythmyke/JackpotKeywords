import { Router } from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { getSearchAnalytics } from '../services/searchConsole';
import { API_SOURCES, type ApiSource } from '../services/apiCredits';

const router = Router();
const db = admin.firestore();

const ADMIN_EMAILS = ['smythmyke@gmail.com'];

/**
 * Should a given email be excluded from all stats counters?
 *
 * - Admin (smythmyke@gmail.com) — internal usage, never counted as a customer.
 * - Anything ending @example.com — convention for smoke-test accounts.
 * - Anything with "test" in the local-part — covers v1-test-*, mcp-test-*, etc.
 *
 * Null/empty email returns false: we can't classify, so we err toward keeping
 * the row (it'll bucket as "unknown" until backfilled). Same predicate is used
 * by MarkItUp and Bull-Generator admin handlers — keep these in sync.
 */
function isExcludedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (e === 'smythmyke@gmail.com') return true;
  if (e.endsWith('@example.com')) return true;
  if (e.includes('test')) return true;
  return false;
}

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

    // --- API customer system attribution rollups (separate from consumer app) ---
    // Attribution buckets mirror ApiSource (mcp/api/rapidapi/x402) so each
    // surface is visible to the seller dashboard; "unknown" catches legacy
    // pre-attribution rows (no source field). Driven by API_SOURCES from
    // apiCredits so the bucket list never drifts when a new source is added.
    type Bucket = ApiSource | 'unknown';
    const BUCKETS: Bucket[] = [...API_SOURCES, 'unknown'];
    const bucket = (v: unknown): Bucket =>
      typeof v === 'string' && API_SOURCES.has(v as ApiSource) ? (v as ApiSource) : 'unknown';

    const usageBySource = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
    const revenueBySource = Object.fromEntries(
      BUCKETS.map((b) => [b, { topup: 0, subscription: 0, total: 0 }]),
    ) as Record<Bucket, { topup: number; subscription: number; total: number }>;
    const usersBySignupSource = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;

    try {
      // First pass: load customers and build the set of excluded customerIds
      // (admin + smoke-test accounts) so we can filter their calls and
      // transactions in the subsequent passes. We do this before iterating
      // apiCalls / apiTransactions so the filter applies uniformly.
      const apiCustomersSnap = await db.collection('apiCustomers').get();
      const excludedCustomerIds = new Set<string>();
      apiCustomersSnap.forEach(doc => {
        const d = doc.data();
        if (isExcludedEmail(d.email as string | undefined)) {
          excludedCustomerIds.add(doc.id);
          return;
        }
        usersBySignupSource[bucket(d.signupSource)] += 1;
      });

      // Count API calls by source (skip admin-flagged rows and rows owned by
      // excluded customers so internal/test usage never pollutes attribution).
      const callsSnap = await db.collection('apiCalls').get();
      callsSnap.forEach(doc => {
        const d = doc.data();
        if (d.admin) return;
        if (excludedCustomerIds.has(d.customerId)) return;
        usageBySource[bucket(d.source)] += 1;
      });

      // Sum topup revenue by source. JK's API system has no subscriptions
      // today; everything goes into the topup bucket. Schema kept consistent
      // with MarkItUp/PatentSearch so the same dashboard renderer works.
      const txSnap = await db.collection('apiTransactions')
        .where('type', '==', 'topup')
        .get();
      txSnap.forEach(doc => {
        const d = doc.data();
        if (excludedCustomerIds.has(d.customerId)) return;
        const b = bucket(d.source);
        const amount = Number(d.amountCents || 0);
        revenueBySource[b].topup += amount;
        revenueBySource[b].total += amount;
      });
    } catch (err: any) {
      functions.logger.warn('Admin stats: API attribution rollups failed:', err.message);
    }

    res.json({
      totalUsers,
      planCounts,
      lifetimeCreditsPurchased: lifetimePurchased,
      currentCreditsBalance: currentBalance,
      lifetimeCreditsUsed: lifetimeUsed,
      recentPurchases,
      // API customer system attribution (mcp / api / unknown only — JK's API
      // system has no extension/website/canva surfaces).
      usageBySource,
      revenueBySource,
      usersBySignupSource,
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
