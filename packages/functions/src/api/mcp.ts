/**
 * Remote MCP server for the OpenAI Apps SDK (ChatGPT) surface.
 *
 * Streamable HTTP, STATELESS: each POST carries one JSON-RPC 2.0 message (or a
 * batch) and gets one application/json response. No SSE, no session state — a
 * single Cloud Function invocation handles a message and returns. This maps
 * cleanly to the serverless model and is the transport OpenAI recommends.
 *
 * We hand-roll JSON-RPC rather than use @modelcontextprotocol/sdk because
 * `packages/functions` is CommonJS and the SDK is ESM-only. The protocol
 * surface a stateless tools server needs is small: initialize, the
 * initialized notification, tools/list, tools/call, ping.
 *
 * SCOPE — free "discovery" surface. See
 * docs/api-deployment/OPENAI-APPS-SDK-PLAN-2026-05-29.md.
 * Exposes ONLY:
 *   - jackpotkeywords_recommend     (1 free run / customer / month, full results)
 *   - jackpotkeywords_usage_status  (free runs remaining this month)
 * Billed against a monthly FREE QUOTA, never the credit balance. The premium
 * tools (recommend-deep / aeo-scan / audit) are intentionally NOT exposed here.
 *
 * BUILD STATUS — Phase 3 (live tools): recommend → monthly free quota → shared
 * pipeline (full results, no balance deduction); usage_status → remaining
 * allowance. Auth is a DEV BYPASS for now (JK_MCP_DEV_AUTH + x-dev-customer-id);
 * real OAuth 2.1 (Stytch) token verification replaces resolveCustomer() in
 * Phase 4. Do NOT deploy as a connectable app until Phase 4.
 *
 * Heavy services (pipeline, quota) are lazy-imported inside tool calls so the
 * protocol path (initialize/tools/list) and cold starts stay light, and the
 * router stays importable without firebase-admin init.
 */

import { Router, type Request, type Response } from 'express';
import * as functions from 'firebase-functions';
import {
  verifyAccessToken,
  fetchWorkOsEmail,
  protectedResourceMetadata,
  protectedResourceMetadataUrl,
} from '../services/mcpOAuth';

const SERVER_NAME = 'jackpotkeywords';
const SERVER_VERSION = '0.2.0';

// Protocol versions we know how to speak. We echo the client's requested
// version when it's one of these; otherwise we answer with our latest.
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26'];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

// ---- JSON-RPC 2.0 types ----------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

// Standard JSON-RPC error codes.
const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_INTERNAL = -32603;

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function fail(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

// ---- Tool definitions ------------------------------------------------------

/**
 * Tool result content block — text + optional structured payload. Matches the
 * shape ChatGPT/MCP clients expect from tools/call.
 */
interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Input fields shared by the recommend / recommend_deep research tools. */
const RESEARCH_INPUT_PROPERTIES = {
  url: {
    type: 'string',
    description:
      'Product URL to extract context from (e.g. https://yourproduct.com). At least one of url/description required.',
  },
  description: {
    type: 'string',
    description:
      "Plain-English product description (e.g. 'AI keyword research tool for indie makers'). At least one of url/description required.",
  },
  budget: {
    type: 'number',
    description: 'Optional daily ad budget in USD. Influences AI scoring / intent classification.',
  },
  location: {
    type: 'string',
    description: "Optional location for local-intent boosting (e.g. 'San Francisco, CA').",
  },
} as const;

const ASYNC_FLOW_NOTE =
  'Runs as a background job (research takes 1–3 minutes): this tool returns a job_id immediately — ' +
  'call jackpotkeywords_get_report with that job_id (poll every ~30 seconds) to fetch the finished report.';

const TOOLS = [
  {
    name: 'jackpotkeywords_recommend',
    description:
      'Run the full JackpotKeywords keyword-research pipeline for a product and return ' +
      'ranked keyword recommendations by composite Jackpot Score (search volume, CPC, ' +
      'competition, trend, AI relevance), backed by real Google Ads Keyword Planner data. ' +
      `Free tier: 1 full report per account per month. ${ASYNC_FLOW_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: RESEARCH_INPUT_PROPERTIES,
      additionalProperties: false,
    },
    annotations: {
      title: 'Keyword research (free monthly report)',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'jackpotkeywords_recommend_deep',
    description:
      'Deep keyword research: everything jackpotkeywords_recommend does PLUS competitor ' +
      'discovery, keyword clusters, and per-category aggregates. Uses prepaid credits ' +
      `($0.30 per run; new accounts include $2.00 starter credit). ${ASYNC_FLOW_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...RESEARCH_INPUT_PROPERTIES,
        limit: {
          type: 'number',
          description: 'Max keywords to return (default 50, max 200).',
        },
      },
      additionalProperties: false,
    },
    annotations: {
      title: 'Deep keyword research (competitors + clusters)',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'jackpotkeywords_audit',
    description:
      'SEO audit of a website: crawls up to 10 pages and scores titles, meta descriptions, ' +
      'headings, structured data, sitemap/robots, Open Graph, and more, with prioritized ' +
      `fixes. Uses prepaid credits ($0.50 per run). ${ASYNC_FLOW_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The site to audit (e.g. example.com or https://example.com). Required.',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    annotations: {
      title: 'SEO site audit',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'jackpotkeywords_aeo_scan',
    description:
      'AI-visibility (AEO) scan: checks whether AI assistants and AI-powered search mention ' +
      'your product/site for relevant queries, and reports gaps with recommendations. ' +
      `Uses prepaid credits ($1.00 per run). ${ASYNC_FLOW_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The product/site URL to scan (e.g. https://yourproduct.com). Required.',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    annotations: {
      title: 'AI visibility (AEO) scan',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: 'jackpotkeywords_get_report',
    description:
      'Fetch the status or finished result of a research job started by jackpotkeywords_recommend, ' +
      'jackpotkeywords_recommend_deep, jackpotkeywords_audit, or jackpotkeywords_aeo_scan. ' +
      'If the job is still running, wait ~30 seconds and call again.',
    inputSchema: {
      type: 'object',
      properties: {
        job_id: {
          type: 'string',
          description: 'The job_id returned when the research tool was called.',
        },
      },
      required: ['job_id'],
      additionalProperties: false,
    },
    annotations: {
      title: 'Get research report',
      readOnlyHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'jackpotkeywords_usage_status',
    description:
      'Report how many free JackpotKeywords keyword reports remain this month for the ' +
      'authenticated account, and when the free allowance resets.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      title: 'Free usage status',
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  {
    name: 'jackpotkeywords_credit_balance',
    description:
      'Report the authenticated account\'s prepaid credit balance (used by the deep research, ' +
      'audit, and AEO scan tools) in USD.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      title: 'Credit balance',
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
] as const;

// ---- Auth — WorkOS AuthKit OAuth 2.1 (dev bypass for local testing) ---------

/** The authenticated user (ChatGPT/Claude), resolved to a JK customer. */
interface McpAuth {
  customerId: string;
  email?: string;
}

type AuthOutcome =
  | { status: 'ok'; auth: McpAuth }
  | { status: 'anonymous' } // no credentials presented
  | { status: 'invalid'; reason: string }; // bad / expired / unresolvable token

/**
 * Resolve the caller to a JK customer.
 *  - Dev bypass (JK_MCP_DEV_AUTH=1 + x-dev-customer-id) for local testing.
 *  - Otherwise verify the AuthKit OAuth 2.1 bearer JWT (jose-free, node:crypto
 *    against AuthKit's JWKS), resolve the verified email, and map it to an
 *    apiCustomer (no jk_live_ key needed).
 */
async function resolveAuth(req: Request): Promise<AuthOutcome> {
  if (process.env.JK_MCP_DEV_AUTH === '1') {
    const id = req.header('x-dev-customer-id');
    if (id) return { status: 'ok', auth: { customerId: id } };
  }

  const authz = req.header('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(authz.trim());
  if (!m) return { status: 'anonymous' };

  const verified = await verifyAccessToken(m[1].trim());
  if ('error' in verified) return { status: 'invalid', reason: verified.error };

  const email = verified.email || (await fetchWorkOsEmail(verified.sub));
  if (!email) return { status: 'invalid', reason: 'email_unavailable' };

  const { getOrCreateCustomerByEmail } = await import('../services/apiCredits');
  const customer = await getOrCreateCustomerByEmail(email, 'mcp');
  return { status: 'ok', auth: { customerId: customer.id, email } };
}

/** 401 + RFC 9728 discovery hint so MCP clients begin the OAuth flow. */
function send401(res: Response, reason: string): void {
  res
    .status(401)
    .set(
      'WWW-Authenticate',
      `Bearer resource_metadata="${protectedResourceMetadataUrl()}", error="invalid_token"`,
    )
    .json({ error: 'unauthorized', reason });
}

function toolError(text: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text }] };
}

// ---- Tool dispatch ---------------------------------------------------------

async function callTool(
  name: string,
  args: Record<string, unknown>,
  auth: McpAuth | null,
): Promise<ToolResult> {
  if (!auth) {
    return toolError('Authentication required. Connect your JackpotKeywords account to use this tool.');
  }
  switch (name) {
    case 'jackpotkeywords_recommend':
      return runRecommendTool(args, auth);
    case 'jackpotkeywords_recommend_deep':
      return runCreditJobTool('recommend-deep', args, auth);
    case 'jackpotkeywords_audit':
      return runCreditJobTool('audit', args, auth);
    case 'jackpotkeywords_aeo_scan':
      return runCreditJobTool('aeo-scan', args, auth);
    case 'jackpotkeywords_get_report':
      return runGetReportTool(args, auth);
    case 'jackpotkeywords_usage_status':
      return runUsageStatusTool(auth);
    case 'jackpotkeywords_credit_balance':
      return runCreditBalanceTool(auth);
    default:
      return toolError(`Unknown tool: ${name}`);
  }
}

/** Extract + lightly validate the shared research inputs (url/description/budget/location). */
function researchInput(args: Record<string, unknown>): {
  input: Record<string, unknown>;
  error?: string;
} {
  const url = typeof args.url === 'string' ? args.url.trim() : '';
  const description = typeof args.description === 'string' ? args.description.trim() : '';
  if (!url && !description) {
    return { input: {}, error: 'Provide a `url` and/or `description` of the product to research.' };
  }
  return {
    input: {
      ...(url ? { url } : {}),
      ...(description ? { description } : {}),
      ...(typeof args.budget === 'number' ? { budget: args.budget } : {}),
      ...(typeof args.location === 'string' ? { location: args.location } : {}),
    },
  };
}

/** The "job started" reply every research tool returns. */
function jobStartedResult(jobId: string, operation: string, footer: string): ToolResult {
  const text =
    `Research started (job_id: ${jobId}, operation: ${operation}). ` +
    'It typically completes in 1–3 minutes. ' +
    `Call jackpotkeywords_get_report with job_id "${jobId}" to fetch the result — if it's still running, wait ~30 seconds and call again.` +
    (footer ? `\n${footer}` : '');
  return {
    content: [{ type: 'text', text }],
    structuredContent: { jobId, operation, status: 'queued' },
  };
}

/**
 * Free-tier keyword research: meters the monthly free allowance at this layer,
 * then enqueues a free_quota job (the worker runs the pipeline directly and
 * refunds the allowance on failure — see jobs/worker.ts).
 */
async function runRecommendTool(args: Record<string, unknown>, auth: McpAuth): Promise<ToolResult> {
  const { input, error } = researchInput(args);
  if (error) return toolError(error);

  const { consumeFreeRecommend, refundFreeRecommend } = await import('../services/apiFreeQuota');
  const { createApiJob } = await import('../services/apiJobs');

  // Consume the monthly free allowance up-front (refunded if the job fails).
  const consume = await consumeFreeRecommend(auth.customerId);
  if (!consume.allowed) {
    // Passive, compliant messaging — state the limit, no upsell, no checkout link.
    if (consume.reason === 'global_cap') {
      return toolError('Free keyword research is at capacity right now. Please try again later.');
    }
    return toolError(
      `You've used your free keyword report for this month. Your free allowance resets on ${consume.status.resetsOn}. ` +
        'The jackpotkeywords_recommend_deep tool remains available via prepaid credits.',
    );
  }

  try {
    const jobId = await createApiJob({
      customerId: auth.customerId,
      operation: 'recommend',
      input,
      source: 'mcp',
      billing: 'free_quota',
    });
    return jobStartedResult(
      jobId,
      'recommend',
      `This uses your free monthly report (resets ${consume.status.resetsOn}); it's automatically refunded if the job fails.`,
    );
  } catch (err) {
    // Don't burn the user's one free report on our failure to enqueue.
    await refundFreeRecommend(auth.customerId).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return toolError(`Could not start keyword research (${message}). Your free report was not counted — please try again.`);
  }
}

/**
 * Credit-billed research tools (recommend-deep / audit / aeo-scan). Fast-fail
 * on balance here for a clean error; the real deduction (and refund on
 * failure) happens when the job worker calls the matching /v1 endpoint.
 */
async function runCreditJobTool(
  operation: 'recommend-deep' | 'audit' | 'aeo-scan',
  args: Record<string, unknown>,
  auth: McpAuth,
): Promise<ToolResult> {
  let input: Record<string, unknown>;
  if (operation === 'recommend-deep') {
    const r = researchInput(args);
    if (r.error) return toolError(r.error);
    input = r.input;
    if (typeof args.limit === 'number') {
      input.limit = Math.max(1, Math.min(200, Math.floor(args.limit)));
    }
  } else {
    const url = typeof args.url === 'string' ? args.url.trim() : '';
    if (!url) return toolError('Provide the `url` to scan (e.g. https://example.com).');
    input = { url };
  }

  const { getApiCustomerById, isBillingExemptApiCustomer, OPERATION_COST_CENTS } = await import(
    '../services/apiCredits'
  );
  const { createApiJob } = await import('../services/apiJobs');

  const cost = OPERATION_COST_CENTS[operation] ?? 0;
  const customer = await getApiCustomerById(auth.customerId);
  if (!customer) return toolError('Account not found. Please reconnect JackpotKeywords.');
  if (!isBillingExemptApiCustomer(customer) && customer.balanceCents < cost) {
    return toolError(
      `This tool costs $${(cost / 100).toFixed(2)} per run; your credit balance is $${(customer.balanceCents / 100).toFixed(2)}. ` +
        'Credits can be added from your account at jackpotkeywords.web.app.',
    );
  }

  try {
    const jobId = await createApiJob({
      customerId: auth.customerId,
      operation,
      input,
      source: 'mcp',
    });
    return jobStartedResult(
      jobId,
      operation,
      `Cost: $${(cost / 100).toFixed(2)} in prepaid credits (automatically refunded if the job fails).`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return toolError(`Could not start ${operation} (${message}). Nothing was charged — please try again.`);
  }
}

/** Poll/fetch a research job's status or finished report. */
async function runGetReportTool(args: Record<string, unknown>, auth: McpAuth): Promise<ToolResult> {
  const jobId = typeof args.job_id === 'string' ? args.job_id.trim() : '';
  if (!jobId) return toolError('Provide the `job_id` returned when the research tool was called.');

  const { getApiJob } = await import('../services/apiJobs');
  const job = await getApiJob(jobId);
  if (!job || job.customerId !== auth.customerId) {
    return toolError(`No job found with id "${jobId}" for this account.`);
  }

  if (job.status === 'queued' || job.status === 'processing') {
    const elapsedS = Math.max(0, Math.round((Date.now() - Date.parse(job.createdAt)) / 1000));
    return {
      content: [
        {
          type: 'text',
          text:
            `Job ${jobId} (${job.operation}) is still ${job.status} — ${elapsedS}s elapsed. ` +
            'Research typically takes 1–3 minutes; wait ~30 seconds and call jackpotkeywords_get_report again.',
        },
      ],
      structuredContent: { jobId, operation: job.operation, status: job.status, elapsedSeconds: elapsedS },
    };
  }

  if (job.status === 'error') {
    return toolError(`Job ${jobId} (${job.operation}) failed: ${job.error || 'unknown error'}.`);
  }

  // success — always render a human-readable text summary. Some MCP clients
  // (claude.ai chat) don't reliably surface large structuredContent payloads
  // to the model, so a structured-data-only response reads as "undefined".
  const result = (job.result ?? {}) as Record<string, unknown>;
  let text: string;
  if (job.operation === 'audit') {
    text = formatAuditText(result);
  } else if (job.operation === 'aeo-scan') {
    text = formatAeoText(result);
  } else if (isRecommendResult(result)) {
    text = formatRecommendText(result, '');
  } else {
    text = `Job ${jobId} (${job.operation}) completed. Full results are in the structured data.`;
  }
  return {
    content: [{ type: 'text', text }],
    structuredContent: { jobId, operation: job.operation, status: 'success', result },
  };
}

function isRecommendResult(result: Record<string, unknown>): result is Parameters<typeof formatRecommendText>[0] {
  return Array.isArray((result as { recommendations?: unknown }).recommendations);
}

async function runCreditBalanceTool(auth: McpAuth): Promise<ToolResult> {
  const { getApiCustomerById } = await import('../services/apiCredits');
  const customer = await getApiCustomerById(auth.customerId);
  if (!customer) return toolError('Account not found. Please reconnect JackpotKeywords.');
  const balance = customer.balanceCents / 100;
  const text =
    `Credit balance: $${balance.toFixed(2)}. ` +
    'Costs per run: deep research $0.30, SEO audit $0.50, AEO scan $1.00 (basic keyword research is free, 1/month).';
  return {
    content: [{ type: 'text', text }],
    structuredContent: { balanceCents: customer.balanceCents, balanceUsd: balance },
  };
}

async function runUsageStatusTool(auth: McpAuth): Promise<ToolResult> {
  const { getFreeQuotaStatus } = await import('../services/apiFreeQuota');
  const status = await getFreeQuotaStatus(auth.customerId);
  const text =
    `Free keyword reports: ${status.remaining} of ${status.limit} remaining this month.` +
    ` Resets ${status.resetsOn}.`;
  return {
    content: [{ type: 'text', text }],
    structuredContent: status as unknown as Record<string, unknown>,
  };
}

/** Human-readable summary of a recommend result for the chat transcript. */
function formatRecommendText(
  result: {
    productName?: string;
    recommendations: Array<{
      keyword: string;
      monthlyVolume: number;
      lowCpc: number;
      highCpc: number;
      competition: string;
      jackpotScore: number;
      intent?: string;
      category?: string;
      trendDirection?: string;
    }>;
    totalCandidates: number;
    returned: number;
  },
  footer: string,
): string {
  const lines: string[] = [];
  if (result.productName) lines.push(`Product: ${result.productName}`);
  lines.push(`Returned ${result.returned} of ${result.totalCandidates} candidate keywords, ranked by Jackpot Score.`);
  lines.push('');
  for (const rec of result.recommendations.slice(0, 25)) {
    const vol = rec.monthlyVolume?.toLocaleString() ?? '?';
    const cpc =
      rec.lowCpc != null && rec.highCpc != null
        ? `$${rec.lowCpc.toFixed(2)}–$${rec.highCpc.toFixed(2)}`
        : 'no CPC';
    const meta = [rec.competition, rec.intent, rec.category, rec.trendDirection ? `trend ${rec.trendDirection}` : null]
      .filter(Boolean)
      .join(', ');
    lines.push(
      `  ${rec.jackpotScore?.toFixed?.(0) ?? rec.jackpotScore}/100 · "${rec.keyword}" · vol ${vol}/mo · ${cpc}` +
        (meta ? ` · ${meta}` : ''),
    );
  }
  if (result.recommendations.length > 25) {
    lines.push(`  … and ${result.recommendations.length - 25} more (see structured data).`);
  }
  if (footer) {
    lines.push('');
    lines.push(footer);
  }

  // Deep results carry cluster/competitor aggregates — surface them in the
  // text, since structured data may not reach the model on every client.
  const clusters = (result as { clusters?: unknown }).clusters;
  if (Array.isArray(clusters) && clusters.length > 0) {
    lines.push('');
    lines.push(`Keyword clusters (${clusters.length}, by volume):`);
    const byVolume = [...clusters].sort(
      (a, b) => ((b?.totalVolume as number) ?? 0) - ((a?.totalVolume as number) ?? 0),
    );
    for (const c of byVolume.slice(0, 15)) {
      const count = Array.isArray(c?.keywordKeys) ? c.keywordKeys.length : '?';
      lines.push(
        `  "${c?.name}" · ${count} keywords · vol ${(c?.totalVolume as number)?.toLocaleString?.() ?? '?'}/mo`,
      );
    }
    if (byVolume.length > 15) lines.push(`  … and ${byVolume.length - 15} more (see structured data).`);
  }
  const competitors = (result as { competitors?: unknown }).competitors;
  if (Array.isArray(competitors) && competitors.length > 0) {
    lines.push('');
    lines.push(`Competitors discovered: ${competitors.join(', ')}`);
  }
  return lines.join('\n');
}

/** Human-readable summary of an SEO audit result for the chat transcript. */
function formatAuditText(result: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`SEO audit of ${result.url ?? 'site'} — overall score ${result.overallScore ?? '?'}/100.`);

  const categoryScores = result.categoryScores as
    | Record<string, { score: number | null; passed: number; total: number }>
    | undefined;
  if (categoryScores) {
    const parts = Object.entries(categoryScores)
      .filter(([, v]) => v && v.total > 0)
      .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v.score ?? '–'} (${v.passed}/${v.total})`);
    if (parts.length) {
      lines.push(`Category scores: ${parts.join(', ')}.`);
    }
  }

  const checks = result.checks as
    | Array<{ label?: string; status?: string; details?: string; recommendation?: string; priority?: string }>
    | undefined;
  const issues = (checks ?? []).filter((c) => c.status === 'fail' || c.status === 'warning');
  if (issues.length) {
    lines.push('');
    lines.push(`Issues found (${issues.length}):`);
    for (const c of issues) {
      lines.push(`  [${c.priority ?? c.status}] ${c.label}: ${c.details ?? ''}`);
      if (c.recommendation) lines.push(`    Fix: ${c.recommendation}`);
    }
  } else {
    lines.push('');
    lines.push('No failed or warning checks.');
  }

  const recommendations = result.recommendations as
    | Array<{ title?: string; description?: string; impact?: string; effort?: string }>
    | undefined;
  if (recommendations?.length) {
    lines.push('');
    lines.push('Top recommendations:');
    recommendations.slice(0, 8).forEach((r, i) => {
      lines.push(`  ${i + 1}. [${r.impact ?? '?'} impact, ${r.effort ?? '?'} effort] ${r.title}: ${r.description ?? ''}`);
    });
  }

  const gaps = result.keywordGaps as Array<{ keyword?: string; difficulty?: string }> | undefined;
  if (gaps?.length) {
    lines.push('');
    lines.push(
      `Keyword gap themes: ${gaps.map((g) => `${g.keyword} (${g.difficulty ?? '?'})`).join(', ')}.`,
    );
  }
  return lines.join('\n');
}

/** Human-readable summary of an AEO (AI-visibility) scan for the chat transcript. */
function formatAeoText(result: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(
    `AI-visibility (AEO) scan of ${result.url ?? 'site'} — visibility score ${result.visibilityScore ?? '?'}/100.`,
  );
  lines.push(
    `Across ${result.queriesChecked ?? '?'} buyer-intent queries: cited as a source in ${result.queriesCited ?? 0}, mentioned in the answer in ${result.queriesMentioned ?? 0}.`,
  );

  const compFreq = result.competitorFrequency as Record<string, number> | undefined;
  if (compFreq && Object.keys(compFreq).length) {
    const ranked = Object.entries(compFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `${name} (${n})`);
    lines.push(`Competitors cited instead: ${ranked.join(', ')}.`);
  }

  const queries = result.queries as
    | Array<{ query?: string; productCited?: boolean; productMentionedInAnswer?: boolean; competitorsCited?: string[] }>
    | undefined;
  if (queries?.length) {
    lines.push('');
    lines.push('Per query:');
    for (const q of queries) {
      const mark = q.productCited ? 'CITED' : q.productMentionedInAnswer ? 'mentioned' : 'absent';
      const comps = q.competitorsCited?.length ? ` — competitors cited: ${q.competitorsCited.join(', ')}` : '';
      lines.push(`  [${mark}] "${q.query}"${comps}`);
    }
  }

  const actionItems = result.actionItems as string[] | undefined;
  if (actionItems?.length) {
    lines.push('');
    lines.push('Action items:');
    actionItems.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
  }
  return lines.join('\n');
}

// ---- JSON-RPC method handling ----------------------------------------------

function negotiateProtocolVersion(params: Record<string, unknown> | undefined): string {
  const requested = params?.protocolVersion;
  if (typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)) {
    return requested;
  }
  return LATEST_PROTOCOL_VERSION;
}

/**
 * Handle one JSON-RPC request object. Returns a response for requests (those
 * with an `id`), or null for notifications (no `id`) — notifications get no
 * JSON-RPC reply.
 */
async function handleMessage(msg: JsonRpcRequest, auth: McpAuth | null): Promise<JsonRpcResponse | null> {
  const isNotification = msg.id === undefined || msg.id === null;
  const id = (msg.id ?? null) as string | number | null;

  if (msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return isNotification ? null : fail(id, ERR_INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request.');
  }

  switch (msg.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: negotiateProtocolVersion(msg.params),
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });

    // Lifecycle notifications — acknowledged, no response body.
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;

    case 'ping':
      return ok(id, {});

    case 'tools/list':
      return ok(id, { tools: TOOLS });

    case 'tools/call': {
      const name = msg.params?.name;
      if (typeof name !== 'string') {
        return fail(id, ERR_INVALID_PARAMS, 'tools/call requires a string `name`.');
      }
      const rawArgs = msg.params?.arguments;
      const args: Record<string, unknown> =
        rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
          ? (rawArgs as Record<string, unknown>)
          : {};
      try {
        const result = await callTool(name, args, auth);
        return ok(id, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return fail(id, ERR_INTERNAL, message);
      }
    }

    default:
      return isNotification ? null : fail(id, ERR_METHOD_NOT_FOUND, `Method not found: ${msg.method}`);
  }
}

// ---- Express transport -----------------------------------------------------

const router = Router();

/**
 * POST /api/mcp — the single stateless Streamable-HTTP endpoint.
 *
 * Accepts a single JSON-RPC message or a batch (array). If every message is a
 * notification/response (no `id`), we reply 202 Accepted with no body, per the
 * MCP Streamable HTTP transport spec. Otherwise we return the JSON-RPC
 * response(s) as application/json.
 */
router.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  const outcome = await resolveAuth(req);
  // Diagnostics — trace which methods clients call and the auth result.
  const methods = Array.isArray(body)
    ? body.map((m) => (m && typeof m === 'object' ? (m as { method?: string }).method : '?')).join(',')
    : body && typeof body === 'object'
      ? (body as { method?: string }).method
      : '?';
  const hasBearer = /^Bearer\s+/i.test(req.header('authorization') || '');
  functions.logger.info(
    `MCP POST methods=[${methods}] bearer=${hasBearer} auth=${outcome.status}` +
      (outcome.status === 'invalid' ? `(${outcome.reason})` : ''),
  );

  // Protected resource — every JSON-RPC call requires a verified identity.
  // Returning 401 + WWW-Authenticate (RFC 9728) on unauthenticated requests is
  // what makes the client run OAuth at CONNECT time. (A deferred 401 on
  // tools/call alone did not reliably trigger Claude's OAuth flow — the client
  // connected anonymously off the public initialize/tools-list and never
  // authenticated.)
  if (outcome.status !== 'ok') {
    send401(res, outcome.status === 'invalid' ? outcome.reason : 'authentication_required');
    return;
  }
  const auth = outcome.auth;

  if (Array.isArray(body)) {
    if (body.length === 0) {
      res.status(400).json(fail(null, ERR_INVALID_REQUEST, 'Empty batch.'));
      return;
    }
    const responses: JsonRpcResponse[] = [];
    for (const msg of body) {
      const r = await handleMessage(msg as JsonRpcRequest, auth);
      if (r) responses.push(r);
    }
    if (responses.length === 0) {
      res.status(202).end();
      return;
    }
    res.json(responses);
    return;
  }

  if (!body || typeof body !== 'object') {
    res.status(400).json(fail(null, ERR_PARSE, 'Request body must be a JSON-RPC 2.0 object.'));
    return;
  }

  const response = await handleMessage(body as JsonRpcRequest, auth);
  if (!response) {
    res.status(202).end();
    return;
  }
  res.json(response);
});

// RFC 9728 Protected Resource Metadata — lets MCP clients discover the
// authorization server (AuthKit) + JWKS. Advertised via WWW-Authenticate on 401.
router.get('/.well-known/oauth-protected-resource', (_req: Request, res: Response) => {
  functions.logger.info('MCP PRM fetched (.well-known/oauth-protected-resource)');
  res.json(protectedResourceMetadata());
});

// Some MCP clients probe with GET (expecting an SSE stream). We're stateless /
// POST-only, so advertise that explicitly rather than 404.
router.get('/', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'method_not_allowed',
    message: 'This MCP endpoint is stateless Streamable HTTP. Send JSON-RPC 2.0 over POST.',
  });
});

export default router;
