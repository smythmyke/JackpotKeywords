import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));

// Import routes
import authRouter from './api/auth';
import searchRouter from './api/search';
import stripeRouter from './api/stripe';

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/stripe', stripeRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jackpotkeywords' });
});

// Export as Firebase Cloud Function
export const api = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onRequest(app);
