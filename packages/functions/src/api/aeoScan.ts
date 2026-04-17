import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { optionalAuthMiddleware, type AuthRequest } from '../middleware/auth';
import { checkAndDeductCredits, refundCredits, getCreditBypassOptions } from '../middleware/credits';
import { runAeoScanFull } from '../services/aeoScan';
import type { ProductContext, AeoResult } from '@jackpotkeywords/shared';

const router = Router();
const db = admin.firestore();

/**
 * POST /api/aeo-scan
 *
 * Run a full AEO scan from keyword search results.
 * Requires either a searchId (to load ProductContext from Firestore)
 * or an inline productContext + domain.
 *
 * Costs 1 credit (or free for Pro/admin).
 */
router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId;
  const { searchId, productContext: inlineContext, domain: inlineDomain } = req.body;

  if (!searchId && !inlineContext) {
    res.status(400).json({ error: 'Provide either searchId or productContext + domain.' });
    return;
  }

  let context: ProductContext;
  let domain: string;

  // Load context from search if searchId provided
  if (searchId) {
    try {
      const searchDoc = await db.collection('searches').doc(searchId).get();
      if (!searchDoc.exists) {
        res.status(404).json({ error: 'Search not found.' });
        return;
      }
      const data = searchDoc.data()!;
      context = data.productContext;
      domain = data.url || '';
      if (!context) {
        res.status(400).json({ error: 'Search has no product context.' });
        return;
      }
    } catch (err: any) {
      functions.logger.error('AEO: Failed to load search:', err.message);
      res.status(500).json({ error: 'Failed to load search data.' });
      return;
    }
  } else {
    context = inlineContext;
    domain = inlineDomain || '';
  }

  if (!domain) {
    res.status(400).json({ error: 'A domain/URL is required for AEO scan.' });
    return;
  }

  // Credit check — 1 credit for AEO scan
  if (!userId) {
    res.status(401).json({ error: 'Sign in to run an AEO scan.' });
    return;
  }

  const bypassOptions = getCreditBypassOptions(req);
  let creditResult: any;
  try {
    creditResult = await checkAndDeductCredits(userId, 1, 'aeo_scan', `AEO scan: ${domain}`, bypassOptions);
  } catch (err: any) {
    res.status(402).json({ error: err.message || 'Insufficient credits.' });
    return;
  }

  const startTime = Date.now();
  try {
    functions.logger.info(`AEO scan: userId=${userId}, domain=${domain}`);
    const aeoResult = await runAeoScanFull(context, domain);

    const scanId = db.collection('aeoScans').doc().id;
    const result = {
      id: scanId,
      userId,
      searchId: searchId || null,
      domain,
      productName: context.productName || context.productLabel,
      createdAt: new Date().toISOString(),
      ...aeoResult,
      metadata: {
        executionTimeMs: Date.now() - startTime,
      },
    };

    // Save to Firestore
    try {
      await db.collection('aeoScans').doc(scanId).set(result);
    } catch (saveErr: any) {
      functions.logger.warn('AEO scan save failed:', saveErr.message);
    }

    functions.logger.info(`AEO scan complete: visibility ${aeoResult.visibilityScore}/100, ${aeoResult.queriesCited}/${aeoResult.queriesChecked} cited, ${(Date.now() - startTime) / 1000}s`);

    res.json(result);
  } catch (error: any) {
    functions.logger.error(`AEO scan error: ${error.message}`);

    // Refund on failure
    try {
      await refundCredits(userId, 1, `AEO scan failed: ${error.message}`);
    } catch { /* ignore refund failure */ }

    res.status(500).json({ error: 'AEO scan failed. Please try again.' });
  }
});

export default router;
