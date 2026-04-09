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

    const userRef = db.doc(`users/${userId}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        uid: userId,
        email: decoded.email || '',
        displayName: decoded.name || '',
        photoURL: decoded.picture || '',
        plan: 'free',
        createdAt: FieldValue.serverTimestamp(),
      });

      // Initialize credits
      await db.doc(`users/${userId}/credits/balance`).set({
        balance: 0,
        lifetimePurchased: 0,
        lifetimeUsed: 0,
        freeSearchesUsed: 0,
      });
    }

    const userData = (await userRef.get()).data();
    const creditsData = (await db.doc(`users/${userId}/credits/balance`).get()).data();

    await logActivity('auth_init', {
      userId,
      email: decoded.email || '',
      isNewUser: !userDoc.exists,
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
