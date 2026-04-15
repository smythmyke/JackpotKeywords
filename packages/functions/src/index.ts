import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

admin.initializeApp();

const app = express();
app.use(cors({
  origin: true,
  // Explicit allowed headers so custom keys (X-Anon-Id, X-Admin-Bypass) survive
  // preflight on some proxies/CDNs that don't auto-mirror request headers.
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Anon-Id', 'X-Admin-Bypass'],
}));
app.use(express.json({ limit: '5mb' }));

// Import routes
import authRouter from './api/auth';
import searchRouter from './api/search';
import auditRouter from './api/audit';
import stripeRouter from './api/stripe';
import adminRouter from './api/admin';
import eventsRouter from './api/events';

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/audit', auditRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/events', eventsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jackpotkeywords' });
});

// Export as Firebase Cloud Function
export const api = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onRequest(app);
