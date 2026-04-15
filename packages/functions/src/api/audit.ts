import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from '../middleware/auth';
import { anonymousRateLimit } from '../middleware/rateLimit';
import { anonSearchLimit, refundAnonSearch } from '../middleware/anonSearchLimit';
import { checkAndDeductCredits, refundCredits } from '../middleware/credits';
import { runSeoAudit } from '../services/seoAudit';
import { runMiniKeywordPipeline } from '../services/miniKeywordPipeline';
import type { SeoAuditResult, MiniKeywordResult } from '@jackpotkeywords/shared';

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

/**
 * Teaser size for mini keyword preview on audit — 20 mid-tier keywords
 * after dropping the top 25% by volume (goldmines). Matches the keyword
 * tool's masking pattern so the CTA to run a full search still shows real value.
 */
const KEYWORD_PREVIEW_TEASER_COUNT = 20;
const KEYWORD_PREVIEW_JACKPOT_FRACTION = 0.25;

function maskKeywordPreview(preview: MiniKeywordResult[], paid: boolean): MiniKeywordResult[] {
  if (paid || preview.length === 0) return preview;
  const sorted = [...preview].sort((a, b) => b.monthlyVolume - a.monthlyVolume);
  const jackpotCutoff = Math.floor(sorted.length * KEYWORD_PREVIEW_JACKPOT_FRACTION);
  const teaser = sorted.slice(jackpotCutoff, jackpotCutoff + KEYWORD_PREVIEW_TEASER_COUNT);
  const visibleSet = new Set(teaser.map((k) => k.keyword));

  let counter = 0;
  return preview.map((kw) => {
    if (visibleSet.has(kw.keyword)) return kw;
    counter += 1;
    return { ...kw, keyword: `••• locked ${counter}` };
  });
}

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
      sampleKeywords: [],
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
// IP safety net for anon — the primary gate is anonSearchLimit (3 lifetime per anon_id, pooled with keyword search).
const auditIpSafetyNet = anonymousRateLimit({
  maxRequests: 10,
  windowSeconds: 86400,
  collection: 'rateLimits_audit',
});

router.post('/', optionalAuthMiddleware, anonSearchLimit(), auditIpSafetyNet, async (req: AuthRequest, res) => {
  const userId = req.userId;
  const anonId = req.anonId;
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

  // Credit deduction for signed-in users — pooled with keyword search
  let creditResult = { allowed: true, newBalance: 0, isFreeSearch: true };
  if (!isAnonymous) {
    creditResult = await checkAndDeductCredits(userId!, 1, 'seo_audit', 'SEO audit');
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

    const paid = !isAnonymous;
    const result: SeoAuditResult = {
      ...auditData,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      paid,
      keywordPreview: null,
    };

    // Save audit to Firestore (strip undefined values to avoid Firestore rejection)
    const firestoreData = JSON.parse(JSON.stringify(result));
    try {
      if (!isAnonymous) {
        await db.collection(`users/${userId}/audits`).doc(result.id).set({
          ...firestoreData,
          savedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      // Always save to global collection so anonymous audits can be claimed after login
      await db.collection('audits').doc(result.id).set({
        ...firestoreData,
        userId: userId || null,
        savedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (saveErr) {
      functions.logger.warn('Audit save failed:', saveErr);
    }

    await logActivity('seo_audit', {
      userId: userId || 'anonymous',
      anonId: req.anonId || null,
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

    // Refund on pipeline failure so user isn't charged for broken runs
    if (!isAnonymous) {
      await refundCredits(userId!, 1, `SEO audit failed: ${error.message}`);
    } else if (anonId) {
      await refundAnonSearch(anonId);
    }

    await logActivity('audit_error', {
      userId: userId || 'anonymous',
      anonId: req.anonId || null,
      url: normalizedUrl?.slice(0, 500) || null,
      error: error.message?.slice(0, 500),
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
    // Check user's personal audits first
    let doc = await db.doc(`users/${userId}/audits/${auditId}`).get();

    // Fall back to global audits collection (handles anonymous audits claimed after login)
    if (!doc.exists) {
      doc = await db.doc(`audits/${auditId}`).get();
      if (doc.exists) {
        // Copy to user's collection for future lookups
        const data = doc.data()!;
        const userAuditData = { ...data, userId, paid: true, savedAt: admin.firestore.FieldValue.serverTimestamp() };
        await db.collection(`users/${userId}/audits`).doc(auditId).set(userAuditData);
      }
    }

    if (!doc.exists) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    // Return with paid=true since user is authenticated
    const data = doc.data()!;
    res.json({ ...data, paid: true });
  } catch (error: any) {
    functions.logger.error('Get audit error:', error);
    res.status(500).json({ error: 'Failed to load audit' });
  }
});

/**
 * POST /api/audit/:auditId/keywords
 * Bundled with the original audit credit — no additional deduction.
 * Lazy-loaded from the frontend after the audit renders so users see
 * results immediately and the KP enrichment (~3-5s) happens async.
 * Result cached on the audit doc for idempotency.
 */
router.post('/:auditId/keywords', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const { auditId } = req.params;
  const userId = req.userId;
  const isPaid = !!userId;

  try {
    // Load the audit — check user's personal collection first, then global
    let auditDoc: admin.firestore.DocumentSnapshot | null = null;
    if (userId) {
      const userAudit = await db.doc(`users/${userId}/audits/${auditId}`).get();
      if (userAudit.exists) auditDoc = userAudit;
    }
    if (!auditDoc || !auditDoc.exists) {
      const global = await db.doc(`audits/${auditId}`).get();
      if (global.exists) auditDoc = global;
    }

    if (!auditDoc || !auditDoc.exists) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const auditData = auditDoc.data()!;

    // Return cached preview if already computed. Re-apply the volume filter
    // so audits cached before the filter landed no longer surface zero-volume rows.
    if (Array.isArray(auditData.keywordPreview) && auditData.keywordPreview.length > 0) {
      const filtered = (auditData.keywordPreview as MiniKeywordResult[]).filter(
        (k) => (k.monthlyVolume ?? 0) >= 10,
      );
      res.json({
        keywordPreview: maskKeywordPreview(filtered, isPaid),
        paid: isPaid,
        cached: true,
      });
      return;
    }

    const auditUrl = typeof auditData.url === 'string' ? auditData.url : '';
    const preview = await runMiniKeywordPipeline(auditUrl);

    // Persist full unmasked preview to audit doc(s)
    const updates = { keywordPreview: preview.length > 0 ? preview : [] };
    try {
      await db.doc(`audits/${auditId}`).set(updates, { merge: true });
      if (userId) {
        await db.doc(`users/${userId}/audits/${auditId}`).set(updates, { merge: true });
      }
    } catch (saveErr) {
      functions.logger.warn('Audit keyword preview save failed:', saveErr);
    }

    await logActivity('audit_keyword_preview', {
      userId: userId || 'anonymous',
      anonId: req.anonId || null,
      auditId,
      keywordCount: preview.length,
    });

    res.json({
      keywordPreview: maskKeywordPreview(preview, isPaid),
      paid: isPaid,
      cached: false,
    });
  } catch (error: any) {
    functions.logger.error('Audit keyword preview error:', error.message);
    res.status(500).json({ error: 'Failed to generate keyword preview' });
  }
});

export default router;
