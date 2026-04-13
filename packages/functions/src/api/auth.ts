import { Router } from 'express';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const router = Router();
const db = admin.firestore();

async function logActivity(action: string, details: Record<string, any>) {
  try {
    await db.collection('activityLog').add({
      action,
      ...details,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    // Don't let logging failures break auth
  }
}

/**
 * POST /api/auth/init
 * Called after Firebase Auth sign-in to ensure user document exists
 */
router.post('/init', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    const userId = decoded.uid;

    // Sanitize attribution from request body — only allow known string fields
    const rawAttr = (req.body && req.body.attribution) || null;
    let attribution: Record<string, any> | null = null;
    if (rawAttr && typeof rawAttr === 'object') {
      const allowedKeys = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_page', 'referrer', 'referrer_type'];
      attribution = {};
      for (const key of allowedKeys) {
        const val = rawAttr[key];
        if (typeof val === 'string' && val.length > 0 && val.length < 500) {
          attribution[key] = val;
        }
      }
      if (typeof rawAttr.captured_at === 'number') {
        attribution.captured_at = rawAttr.captured_at;
      }
      if (Object.keys(attribution).length === 0) attribution = null;
    }

    const userRef = db.doc(`users/${userId}`);
    const userDoc = await userRef.get();
    const isNewUser = !userDoc.exists;

    if (isNewUser) {
      // Create new user document — store attribution on first sign-in
      await userRef.set({
        uid: userId,
        email: decoded.email || '',
        displayName: decoded.name || '',
        photoURL: decoded.picture || '',
        plan: 'free',
        createdAt: FieldValue.serverTimestamp(),
        ...(attribution ? { attribution } : {}),
      });

      // Initialize credits
      await db.doc(`users/${userId}/credits/balance`).set({
        balance: 0,
        lifetimePurchased: 0,
        lifetimeUsed: 0,
        freeSearchesUsed: 0,
      });
    } else if (attribution && !userDoc.data()?.attribution) {
      // Existing user with no prior attribution — backfill it
      await userRef.set({ attribution }, { merge: true });
    }

    const userData = (await userRef.get()).data();
    const creditsData = (await db.doc(`users/${userId}/credits/balance`).get()).data();

    await logActivity('auth_init', {
      userId,
      email: decoded.email || '',
      isNewUser,
      ...(attribution && isNewUser ? {
        gclid: attribution.gclid || null,
        utm_source: attribution.utm_source || null,
        utm_campaign: attribution.utm_campaign || null,
      } : {}),
    });

    res.json({
      user: userData,
      credits: creditsData,
    });
  } catch (error: any) {
    console.error('Auth init error:', error);
    res.status(500).json({ error: 'Failed to initialize user', details: error.message });
  }
});

export default router;
