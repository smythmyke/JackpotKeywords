import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from '../middleware/auth';
import { runSeoAudit } from '../services/seoAudit';
import type { SeoAuditResult } from '@jackpotkeywords/shared';

const router = Router();
const db = admin.firestore();

async function logActivity(action: string, details: Record<string, any>) {
  try {
    await db.collection('activityLog').add({
      action,
      ...details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Don't let logging failures break the request
  }
}

/**
 * Mask audit response for anonymous (not signed in) users.
 * Check statuses (pass/warning/fail) stay visible as a teaser,
 * but recommendation text and keyword gaps are replaced with placeholders.
 */
const FREE_PREVIEW_RECOMMENDATIONS = 2;
const FREE_PREVIEW_GAPS = 2;

function maskAnonymousAuditResponse(result: SeoAuditResult): SeoAuditResult {
  const maskedChecks = result.checks.map((check) => ({
    ...check,
    recommendation: check.recommendation ? '••• Sign in to see recommendation' : undefined,
  }));

  const maskedGaps = result.keywordGaps.map((gap, i) => {
    if (i < FREE_PREVIEW_GAPS) return gap;
    return {
      keyword: '••• sign in to see',
      opportunity: '••• Sign in to see opportunity',
      difficulty: gap.difficulty,
    };
  });

  const maskedRecs = result.recommendations.map((rec, i) => {
    if (i < FREE_PREVIEW_RECOMMENDATIONS) return rec;
    return {
      ...rec,
      title: '••• sign in to see',
      description: '••• Sign in free to see this recommendation',
    };
  });

  return {
    ...result,
    checks: maskedChecks,
    keywordGaps: maskedGaps,
    recommendations: maskedRecs,
  };
}

/**
 * POST /api/audit
 * Main SEO audit endpoint — free for signed-in users, preview for anonymous
 */
router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId;
  const isAnonymous = !userId;
  const { url } = req.body as { url?: string };

  functions.logger.info(`Audit request: userId=${userId || 'anonymous'}, email=${req.userEmail || 'none'}`);

  if (!url?.trim()) {
    res.status(400).json({ error: 'URL required' });
    return;
  }

  // Normalize and validate URL
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    res.status(400).json({ error: 'Invalid URL. Please enter a domain like example.com or a full URL like https://example.com' });
    return;
  }

  // No credit deduction — SEO audit is free for signed-in users

  try {
    const auditData = await runSeoAudit(normalizedUrl);

    const paid = !isAnonymous;
    const result: SeoAuditResult = {
      ...auditData,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      paid,
    };

    // Auto-save for authenticated users
    if (!isAnonymous) {
      try {
        await db.collection(`users/${userId}/audits`).doc(result.id).set({
          ...result,
          savedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (saveErr) {
        functions.logger.warn('Audit save failed:', saveErr);
        // Don't block the response if save fails
      }
    }

    await logActivity('seo_audit', {
      userId: userId || 'anonymous',
      url: normalizedUrl.slice(0, 200),
      domain: parsedUrl.hostname,
      overallScore: result.overallScore,
      pagesAnalyzed: result.metadata.pagesAnalyzed,
      executionTimeMs: result.metadata.executionTimeMs,
    });

    // Mask for anonymous users only
    const response = paid ? result : maskAnonymousAuditResponse(result);
    res.json(response);
  } catch (error: any) {
    functions.logger.error(`SEO Audit error: ${error.message}`, error);

    await logActivity('audit_error', {
      userId: userId || 'anonymous',
      url: normalizedUrl?.slice(0, 200),
      error: error.message?.slice(0, 200),
    });

    res.status(500).json({ error: 'SEO audit failed. Please try again.' });
  }
});

/**
 * GET /api/audit
 * List saved audits for the authenticated user
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const snapshot = await db.collection(`users/${userId}/audits`)
      .orderBy('savedAt', 'desc')
      .limit(20)
      .get();

    const audits = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        url: data.url,
        domain: data.domain,
        overallScore: data.overallScore,
        createdAt: data.createdAt,
        pagesAnalyzed: data.metadata?.pagesAnalyzed || 0,
      };
    });

    res.json({ audits });
  } catch (error: any) {
    functions.logger.error('List audits error:', error);
    res.status(500).json({ error: 'Failed to load audits' });
  }
});

/**
 * GET /api/audit/:auditId
 * Get a specific saved audit
 */
router.get('/:auditId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { auditId } = req.params;

  try {
    const doc = await db.doc(`users/${userId}/audits/${auditId}`).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    res.json(doc.data());
  } catch (error: any) {
    functions.logger.error('Get audit error:', error);
    res.status(500).json({ error: 'Failed to load audit' });
  }
});

export default router;
