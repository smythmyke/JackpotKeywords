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

  // Free-quota jobs (MCP free tier) were already metered by the initiating
  // surface, so they must NOT go through the /v1 endpoint (which would deduct
  // credits on top). Run the pipeline directly instead.
  if (job.billing === 'free_quota') {
    await runFreeQuotaJob(jobId, job);
    return;
  }

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
        // Attribution: jobs created by the MCP connector carry source:'mcp';
        // legacy jobs (Zapier's POST /v1/jobs) have no source field.
        'X-Api-Source': job.source || 'zapier',
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
 * Run a free-quota job (MCP free tier) by invoking the pipeline directly.
 * The monthly free allowance was consumed when the job was created; refund it
 * if the pipeline fails so the user's one free report isn't burned on our
 * failure. Only 'recommend' is offered on the free tier.
 */
async function runFreeQuotaJob(jobId: string, job: import('../services/apiJobs').ApiJob): Promise<void> {
  if (job.operation !== 'recommend') {
    const error = `Operation not available on the free tier: ${job.operation}`;
    await completeApiJob(jobId, 'error', { error });
    return;
  }

  const { runRecommendPipeline } = await import('../services/recommendPipeline');
  const { refundFreeRecommend, recordFreeRecommendCall } = await import('../services/apiFreeQuota');

  const input = job.input || {};
  const startTime = Date.now();
  try {
    const result = await runRecommendPipeline({
      description: typeof input.description === 'string' ? input.description : undefined,
      url: typeof input.url === 'string' ? input.url : undefined,
      budget: typeof input.budget === 'number' ? input.budget : undefined,
      location: typeof input.location === 'string' ? input.location : undefined,
      limit: 200, // free tier returns the full ranked set
    });
    const latencyMs = Date.now() - startTime;
    void recordFreeRecommendCall(job.customerId, latencyMs, result.returned);
    await completeApiJob(jobId, 'success', {
      result: {
        productName: result.productName,
        query: result.query,
        url: result.url,
        recommendations: result.recommendations,
        totalCandidates: result.totalCandidates,
        returned: result.returned,
        executionTimeMs: latencyMs,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    functions.logger.error(`runFreeQuotaJob ${jobId} failed:`, errMsg);
    await refundFreeRecommend(job.customerId).catch(() => {});
    await completeApiJob(jobId, 'error', {
      error: `${errMsg} (your free report was not counted)`,
    });
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
