import { Router } from 'express';
import * as admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

    res.json({
      user: userData,
      credits: creditsData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize user' });
  }
});

export default router;
