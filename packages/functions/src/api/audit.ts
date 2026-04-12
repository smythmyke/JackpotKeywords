import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from '../middleware/auth';
import { checkAndDeductCredits, refundCredits } from '../middleware/credits';
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
 * Number of keyword gaps and recommendations to show as a teaser for unpaid users.
 * Check statuses (pass/warning/fail) are always visible; only the actionable
 * recommendation text and keyword gaps are masked.
 */
const FREE_PREVIEW_RECOMMENDATIONS = 2;
const FREE_PREVIEW_GAPS = 2;

/**
 * Mask recommendation details and keyword gaps for unpaid users.
 * Check items keep their status (pass/warning/fail) visible as a teaser,
 * but recommendation text is replaced with a placeholder.
 */
function maskUnpaidAuditResponse(result: SeoAuditResult): SeoAuditResult {
  // Mask recommendation text on check items (keep status visible)
  const maskedChecks = result.checks.map((check) => ({
    ...check,
    recommendation: check.recommendation ? '••• Unlock full report to see recommendation' : undefined,
  }));

  // Show only first N keyword gaps, mask the rest
  const maskedGaps = result.keywordGaps.map((gap, i) => {
    if (i < FREE_PREVIEW_GAPS) return gap;
    return {
      keyword: '••• locked keyword',
      opportunity: '••• Unlock full report to see opportunity',
      difficulty: gap.difficulty,
    };
  });

  // Show only first N recommendations, mask the rest
  const maskedRecs = result.recommendations.map((rec, i) => {
    if (i < FREE_PREVIEW_RECOMMENDATIONS) return rec;
    return {
      ...rec,
      title: '••• locked recommendation',
      description: '••• Unlock full report to see details',
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
 * Main SEO audit endpoint
 */
router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId;
  const isAnonymous = !userId;
  const { url } = req.body as { url?: string };

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

  // Check and deduct credits (skip for anonymous)
  let creditResult = { allowed: true, newBalance: 0, isFreeSearch: true };
  if (!isAnonymous) {
    creditResult = await checkAndDeductCredits(userId, 1, 'seo_audit', 'SEO site audit');

    if (!creditResult.allowed) {
      res.status(402).json({
        error: 'Insufficient credits',
        balance: creditResult.newBalance,
      });
      return;
    }
  }

  try {
    const auditData = await runSeoAudit(normalizedUrl);

    const paid = !isAnonymous && !creditResult.isFreeSearch;
    const result: SeoAuditResult = {
      ...auditData,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      paid,
    };

    await logActivity('seo_audit', {
      userId: userId || 'anonymous',
      url: normalizedUrl.slice(0, 200),
      domain: parsedUrl.hostname,
      overallScore: result.overallScore,
      pagesAnalyzed: result.metadata.pagesAnalyzed,
      executionTimeMs: result.metadata.executionTimeMs,
    });

    // Mask for unpaid users
    const response = paid ? result : maskUnpaidAuditResponse(result);
    res.json(response);
  } catch (error: any) {
    functions.logger.error(`SEO Audit error: ${error.message}`, error);

    // Refund credits on failure
    if (!isAnonymous && !creditResult.isFreeSearch) {
      try {
        await refundCredits(userId, 1, 'SEO audit failed');
      } catch (refundErr) {
        functions.logger.error('Credit refund failed:', refundErr);
      }
    }

    await logActivity('audit_error', {
      userId: userId || 'anonymous',
      url: url?.slice(0, 200),
      error: error.message?.slice(0, 200),
    });

    res.status(500).json({ error: 'SEO audit failed. Please try again.' });
  }
});

/**
 * POST /api/audit/claim
 * Claim an anonymous audit after signing in
 */
router.post('/claim', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const creditResult = await checkAndDeductCredits(userId, 1, 'seo_audit', 'SEO audit (claimed)');

  if (!creditResult.allowed) {
    res.status(402).json({
      error: 'Insufficient credits',
      balance: creditResult.newBalance,
    });
    return;
  }

  await logActivity('audit_claim', {
    userId,
    isFreeSearch: creditResult.isFreeSearch,
  });

  res.json({ paid: !creditResult.isFreeSearch });
});

export default router;
