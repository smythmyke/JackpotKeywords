// Provisions (idempotently) the single billing-exempt "house" apiCustomers doc
// that all RapidAPI gateway traffic resolves to. RapidAPI is the ledger for that
// surface, so this account never holds a real balance and its calls skip
// deduction (see isBillingExemptApiCustomer / deductBalance). Prints the doc id
// to paste into JK_RAPIDAPI_HOUSE_CUSTOMER_ID.
//
// Usage (needs Application Default Credentials for the project):
//   node scripts/provision-rapidapi-house.mjs
import admin from 'firebase-admin';

const PROJECT_ID = 'even-plate-378520';
const HOUSE_EMAIL = 'rapidapi-house@jackpotkeywords.internal';

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

async function main() {
  const existing = await db
    .collection('apiCustomers')
    .where('email', '==', HOUSE_EMAIL)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    // Self-heal the flag in case the doc predates billingExempt.
    if (doc.data().billingExempt !== true) {
      await doc.ref.update({ billingExempt: true });
      console.log('Updated existing house account: set billingExempt=true');
    }
    console.log(`RapidAPI house account already exists.\nJK_RAPIDAPI_HOUSE_CUSTOMER_ID=${doc.id}`);
    return;
  }

  const ref = await db.collection('apiCustomers').add({
    email: HOUSE_EMAIL,
    balanceCents: 0,
    lifetimeDepositedCents: 0,
    billingExempt: true,
    signupSource: 'rapidapi',
    createdAt: new Date().toISOString(),
  });

  console.log(`Created RapidAPI house account.\nJK_RAPIDAPI_HOUSE_CUSTOMER_ID=${ref.id}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
