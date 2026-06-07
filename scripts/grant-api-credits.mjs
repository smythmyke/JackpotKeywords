// Grant (or top up) prepaid API credits for an apiCustomers account by email.
//
// Creates the customer doc if it doesn't exist yet — important for the Claude
// Connector Directory reviewer (mcp-review@anthropic.com): their doc only
// appears on first OAuth sign-in, but credits must be pre-seeded BEFORE review
// (GovToolsPro lesson: grant scripts that assume the doc exists silently fail).
//
// Usage: node scripts/grant-api-credits.mjs <email> [cents]
//   node scripts/grant-api-credits.mjs mcp-review@anthropic.com 1000   # $10.00
import admin from 'firebase-admin';

const PROJECT_ID = 'even-plate-378520';
const email = (process.argv[2] || '').toLowerCase().trim();
const cents = Number(process.argv[3]) || 1000;

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/grant-api-credits.mjs <email> [cents]');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

const now = new Date().toISOString();
const existing = await db.collection('apiCustomers').where('email', '==', email).limit(1).get();

let customerId;
let newBalance;
if (existing.empty) {
  const ref = db.collection('apiCustomers').doc();
  customerId = ref.id;
  newBalance = cents;
  await ref.set({
    email,
    balanceCents: cents,
    lifetimeDepositedCents: 0,
    createdAt: now,
    signupSource: 'mcp',
  });
  console.log(`Created apiCustomers/${customerId} for ${email}`);
} else {
  const doc = existing.docs[0];
  customerId = doc.id;
  newBalance = (doc.data().balanceCents || 0) + cents;
  await doc.ref.update({ balanceCents: newBalance });
  console.log(`Updated apiCustomers/${customerId} for ${email}`);
}

await db.collection('apiTransactions').add({
  customerId,
  type: 'grant',
  amountCents: cents,
  description: `Manual credit grant via scripts/grant-api-credits.mjs`,
  timestamp: now,
});

console.log(`Granted ${cents} cents — new balance: $${(newBalance / 100).toFixed(2)}`);
process.exit(0);
