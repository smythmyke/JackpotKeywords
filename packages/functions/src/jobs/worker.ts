/**
 * Async job worker — runs on the Firestore onCreate trigger for apiJobs/{jobId}
 * (registered in index.ts). It executes the job by calling the matching
 * SYNCHRONOUS /v1 endpoint over HTTP with internal auth, so all billing,
 * pipeline, and refund logic stays in the existing handlers. When the job
 * finishes it POSTs the result to the caller's callback URL (Zapier).
 */

import * as functions from 'firebase-functions';
import {
  claimApiJob,
  completeApiJob,
  OPERATION_ENDPOINT,
} from '../services/apiJobs';

const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE ||
  'https://us-central1-even-plate-378520.cloudfunctions.net/api/api/v1';
const INTERNAL_JOB_SECRET = process.env.JK_INTERNAL_JOB_SECRET || '';
const WORKER_USER_AGENT = 'jackpotkeywords-zapier/0.1.0';

/**
 * Process a single job. Idempotent: claims the job (queued → processing) and
 * no-ops if another invocation already claimed it. Always reaches a terminal
 * state and POSTs the callback, so the trigger never needs to retry.
 */
export async function runApiJob(jobId: string): Promise<void> {
  if (!INTERNAL_JOB_SECRET) {
    functions.logger.error(
      `runApiJob ${jobId}: JK_INTERNAL_JOB_SECRET is not set — async jobs are disabled.`,
    );
    return;
  }

  const job = await claimApiJob(jobId);
  if (!job) return; // already claimed/finished — at-least-once trigger guard

  const endpoint = OPERATION_ENDPOINT[job.operation];
  if (!endpoint) {
    await completeApiJob(jobId, 'error', { error: `Unknown operation: ${job.operation}` });
    await postCallback(job.callbackUrl, { jobId, status: 'error', error: `Unknown operation: ${job.operation}` });
    return;
  }

  try {
    const res = await fetch(`${INTERNAL_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_JOB_SECRET,
        'X-Api-Customer-Id': job.customerId,
        'X-Api-Source': 'zapier',
        'User-Agent': WORKER_USER_AGENT,
      },
      body: JSON.stringify(job.input || {}),
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const body = data as { error?: string; message?: string };
      const errMsg = body.message || body.error || `HTTP ${res.status}`;
      await completeApiJob(jobId, 'error', { error: errMsg });
      await postCallback(job.callbackUrl, { jobId, status: 'error', error: errMsg });
      return;
    }

    await completeApiJob(jobId, 'success', { result: data });
    await postCallback(job.callbackUrl, {
      jobId,
      status: 'success',
      ...(data as Record<string, unknown>),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    functions.logger.error(`runApiJob ${jobId} failed:`, errMsg);
    await completeApiJob(jobId, 'error', { error: errMsg });
    await postCallback(job.callbackUrl, { jobId, status: 'error', error: errMsg });
  }
}

/**
 * POST the job outcome to the caller's callback URL. Best-effort — a delivery
 * failure is logged but never throws (the job's terminal state is already
 * persisted and pollable via GET /v1/jobs/:id).
 */
async function postCallback(
  callbackUrl: string | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!callbackUrl) return;
  try {
    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    functions.logger.error(
      `Callback POST to ${callbackUrl} failed:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}
