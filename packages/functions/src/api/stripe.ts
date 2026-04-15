import { Router } from 'express';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { createCreditCheckout, createSubscriptionCheckout, handleWebhook } from '../services/stripe';
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from '@jackpotkeywords/shared';

const router = Router();
const db = admin.firestore();

async function logCheckoutStarted(userId: string, anonId: string | null, kind: string, id: string) {
  try {
    await db.collection('activityLog').add({
      action: 'checkout_started',
      userId,
      anonId,
      kind,
      id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // non-fatal
  }
}

router.get('/credit-packs', (_req, res) => {
  res.json({ packs: CREDIT_PACKS });
});

router.get('/subscription-plans', (_req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS });
});

router.post('/create-credit-checkout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { packId } = req.body;
    const url = await createCreditCheckout(req.userId!, packId, req.userEmail);
    await logCheckoutStarted(req.userId!, req.anonId || null, 'credit', packId);
    res.json({ url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/create-subscription-checkout', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { planId } = req.body;
    const url = await createSubscriptionCheckout(req.userId!, planId, req.userEmail);
    await logCheckoutStarted(req.userId!, req.anonId || null, 'subscription', planId);
    res.json({ url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
    });
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    await handleWebhook(event);
    res.json({ received: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
