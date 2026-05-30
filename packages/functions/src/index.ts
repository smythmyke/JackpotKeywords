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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Anon-Id', 'X-Admin-Bypass', 'X-Disable-Admin'],
}));
app.use(express.json({ limit: '5mb' }));

// Import routes
import authRouter from './api/auth';
import searchRouter from './api/search';
import auditRouter from './api/audit';
import stripeRouter from './api/stripe';
import adminRouter from './api/admin';
import eventsRouter from './api/events';
import aeoScanRouter from './api/aeoScan';
import ideasRouter from './api/ideas';
import v1Router from './api/v1';
import mcpRouter from './api/mcp';

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/audit', auditRouter);
app.use('/api/aeo-scan', aeoScanRouter);
app.use('/api/ideas', ideasRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/events', eventsRouter);
app.use('/api/v1', v1Router);
// Remote MCP server for the OpenAI Apps SDK (ChatGPT). Stateless Streamable
// HTTP. Direct URL: https://us-central1-even-plate-378520.cloudfunctions.net/api/api/mcp
// NOTE: no auth yet (Phase 1 skeleton) — not a connectable app until Phase 4.
app.use('/api/mcp', mcpRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jackpotkeywords' });
});

// Export as Firebase Cloud Function
export const api = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onRequest(app);

// Async job worker: runs long /v1 operations in the background for surfaces
// that can't hold a 60-180s request open (e.g. Zapier). Fires when POST
// /v1/jobs writes an apiJobs doc; calls the matching sync endpoint and POSTs
// the result to the caller's callback URL. See jobs/worker.ts.
import { runApiJob } from './jobs/worker';

export const processApiJob = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .firestore.document('apiJobs/{jobId}')
  .onCreate(async (_snap, context) => {
    await runApiJob(context.params.jobId as string);
  });
// force redeploy 1776446313
