import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from '@jackpotkeywords/shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
});
const db = admin.firestore();

export async function createCreditCheckout(
  userId: string,
  packId: string,
  email?: string,
): Promise<string> {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error(`Invalid pack: ${packId}`);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `JackpotKeywords — ${pack.name}`,
          description: `${pack.credits} keyword ${pack.credits === 1 ? 'search' : 'searches'}`,
        },
        unit_amount: pack.priceInCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    customer_email: email,
    metadata: { userId, packId, credits: String(pack.credits) },
    payment_intent_data: {
      statement_descriptor: 'JACKPOTKEYWORDS',
    },
    custom_text: {
      submit: { message: 'Payment processed securely by JackpotKeywords' },
    },
    success_url: `${process.env.APP_URL || 'https://jackpotkeywords.web.app'}/account?purchase=success`,
    cancel_url: `${process.env.APP_URL || 'https://jackpotkeywords.web.app'}/pricing`,
  });

  return session.url || '';
}

export async function createSubscriptionCheckout(
  userId: string,
  planId: string,
  email?: string,
): Promise<string> {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Invalid plan: ${planId}`);
  if (!plan.stripePriceId) throw new Error(`Stripe price not configured for ${planId}`);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    mode: 'subscription',
    customer_email: email,
    metadata: { userId, planId },
    subscription_data: {
      metadata: { userId, planId },
      description: 'JackpotKeywords Pro subscription',
    },
    custom_text: {
      submit: { message: 'Payment processed securely by JackpotKeywords' },
    },
    success_url: `${process.env.APP_URL || 'https://jackpotkeywords.web.app'}/account?subscribe=success`,
    cancel_url: `${process.env.APP_URL || 'https://jackpotkeywords.web.app'}/pricing`,
  });

  return session.url || '';
}

export async function handleWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, packId, credits, planId } = session.metadata || {};

      if (credits && userId) {
        // Credit purchase
        const creditsNum = parseInt(credits, 10);
        const creditsRef = db.doc(`users/${userId}/credits/balance`);
        const transactionsRef = db.collection(`users/${userId}/transactions`);

        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(creditsRef);
          const data = doc.data() || { balance: 0, lifetimePurchased: 0 };

          transaction.set(creditsRef, {
            balance: (data.balance || 0) + creditsNum,
            lifetimePurchased: (data.lifetimePurchased || 0) + creditsNum,
          }, { merge: true });

          transaction.create(transactionsRef.doc(), {
            type: 'purchase',
            amount: creditsNum,
            description: `Purchased ${creditsNum} search credits (${packId})`,
            stripeSessionId: session.id,
            timestamp: FieldValue.serverTimestamp(),
          });
        });

        functions.logger.info(`Credits added: ${creditsNum} for user ${userId}`);
      }

      if (planId && userId) {
        // Subscription activated
        await db.doc(`users/${userId}`).set(
          { plan: planId, stripeCustomerId: session.customer },
          { merge: true },
        );
        functions.logger.info(`Subscription activated: ${planId} for user ${userId}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      // Find user by Stripe customer ID and downgrade
      const users = await db.collection('users')
        .where('stripeCustomerId', '==', customerId)
        .limit(1)
        .get();

      if (!users.empty) {
        await users.docs[0].ref.set({ plan: 'free' }, { merge: true });
        functions.logger.info(`Subscription cancelled for customer ${customerId}`);
      }
      break;
    }
  }
}
