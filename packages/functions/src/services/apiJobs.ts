/**
 * Async job layer for the /v1 API.
 *
 * Some surfaces (notably Zapier, whose action steps hard-time-out at 30s) can't
 * call the synchronous /v1 endpoints directly — /recommend etc. routinely take
 * 60-180s. This layer accepts a job, runs it in the background via a Firestore
 * onCreate trigger (see jobs/worker.ts), and optionally POSTs the result to a
 * caller-supplied callback URL when done.
 *
 * The worker reuses the existing synchronous endpoints over HTTP (internal
 * auth), so billing / pipeline / refund logic is untouched and lives in exactly
 * one place.
 *
 * Firestore schema:
 *   apiJobs/{jobId} — { customerId, operation, input, callbackUrl?, status,
 *                       result?, error?, attempts, createdAt, updatedAt }
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

export type ApiJobOperation = 'recommend' | 'recommend-deep' | 'aeo-scan' | 'audit';
export type ApiJobStatus = 'queued' | 'processing' | 'success' | 'error';

export const API_JOB_OPERATIONS: ReadonlySet<string> = new Set<ApiJobOperation>([
  'recommend',
  'recommend-deep',
  'aeo-scan',
  'audit',
]);

/** Maps a job operation slug to its synchronous endpoint path. */
export const OPERATION_ENDPOINT: Readonly<Record<ApiJobOperation, string>> = {
  recommend: '/recommend',
  'recommend-deep': '/recommend-deep',
  'aeo-scan': '/aeo-scan',
  audit: '/audit',
};

/**
 * How the worker settles the job's cost:
 *  - 'credits' (default): the worker calls the sync /v1 endpoint, which
 *    deducts/refunds the customer's credit balance as a direct call would.
 *  - 'free_quota': the initiating surface (MCP free tier) already consumed the
 *    monthly free allowance; the worker runs the pipeline directly and refunds
 *    the allowance on failure. Never touches the credit balance.
 */
export type ApiJobBilling = 'credits' | 'free_quota';

export interface ApiJob {
  id: string;
  customerId: string;
  operation: ApiJobOperation;
  input: Record<string, unknown>;
  callbackUrl?: string;
  /** Attribution surface for X-Api-Source ('mcp' etc.). Absent = legacy Zapier. */
  source?: string;
  billing?: ApiJobBilling;
  status: ApiJobStatus;
  result?: unknown;
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export async function createApiJob(params: {
  customerId: string;
  operation: ApiJobOperation;
  input: Record<string, unknown>;
  callbackUrl?: string;
  source?: string;
  billing?: ApiJobBilling;
}): Promise<string> {
  const now = new Date().toISOString();
  const ref = db.collection('apiJobs').doc();
  await ref.set({
    customerId: params.customerId,
    operation: params.operation,
    input: params.input,
    ...(params.callbackUrl ? { callbackUrl: params.callbackUrl } : {}),
    ...(params.source ? { source: params.source } : {}),
    ...(params.billing ? { billing: params.billing } : {}),
    status: 'queued' as ApiJobStatus,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getApiJob(jobId: string): Promise<ApiJob | null> {
  const doc = await db.doc(`apiJobs/${jobId}`).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<ApiJob, 'id'>) };
}

/**
 * Atomically transition a job from 'queued' to 'processing'. Returns the job if
 * this caller won the claim, or null if it was already claimed/finished — the
 * Firestore onCreate trigger is at-least-once, so this guards against a job
 * running twice.
 */
export async function claimApiJob(jobId: string): Promise<ApiJob | null> {
  const ref = db.doc(`apiJobs/${jobId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const job = { id: snap.id, ...(snap.data() as Omit<ApiJob, 'id'>) };
    if (job.status !== 'queued') return null;
    tx.update(ref, {
      status: 'processing' as ApiJobStatus,
      attempts: (job.attempts || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
    return job;
  });
}

/** Record a terminal outcome for a job. */
export async function completeApiJob(
  jobId: string,
  status: 'success' | 'error',
  payload: { result?: unknown; error?: string },
): Promise<void> {
  await db.doc(`apiJobs/${jobId}`).update({
    status,
    ...(payload.result !== undefined ? { result: payload.result } : {}),
    ...(payload.error ? { error: payload.error } : {}),
    updatedAt: new Date().toISOString(),
  });
}
