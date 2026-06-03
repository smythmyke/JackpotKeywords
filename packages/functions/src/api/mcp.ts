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

const TOOLS = [
  {
    name: 'jackpotkeywords_recommend',
    description:
      'Run the full JackpotKeywords keyword-research pipeline for a product and return ' +
      'ranked keyword recommendations by composite Jackpot Score (search volume, CPC, ' +
      'competition, trend, AI relevance), backed by real Google Ads Keyword Planner data. ' +
      'Free tier: 1 full report per account per month. Latency ~60–180s.',
    inputSchema: {
      type: 'object',
      properties: {
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
      },
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
    case 'jackpotkeywords_usage_status':
      return runUsageStatusTool(auth);
    default:
      return toolError(`Unknown tool: ${name}`);
  }
}

async function runRecommendTool(args: Record<string, unknown>, auth: McpAuth): Promise<ToolResult> {
  const url = typeof args.url === 'string' ? args.url.trim() : '';
  const description = typeof args.description === 'string' ? args.description.trim() : '';
  if (!url && !description) {
    return toolError('Provide a `url` and/or `description` of the product to research.');
  }

  const { consumeFreeRecommend, refundFreeRecommend, recordFreeRecommendCall } = await import(
    '../services/apiFreeQuota'
  );
  const { runRecommendPipeline } = await import('../services/recommendPipeline');

  // Consume the monthly free allowance up-front (refunded if the pipeline fails).
  const consume = await consumeFreeRecommend(auth.customerId);
  if (!consume.allowed) {
    // Passive, compliant messaging — state the limit, no upsell, no checkout link.
    if (consume.reason === 'global_cap') {
      return toolError('Free keyword research is at capacity right now. Please try again later.');
    }
    return toolError(
      `You've used your free keyword report for this month. Your free allowance resets on ${consume.status.resetsOn}.`,
    );
  }

  const startTime = Date.now();
  try {
    const result = await runRecommendPipeline({
      description: description || undefined,
      url: url || undefined,
      budget: typeof args.budget === 'number' ? args.budget : undefined,
      location: typeof args.location === 'string' ? args.location : undefined,
      limit: 200, // free tier returns the full ranked set
    });
    const latencyMs = Date.now() - startTime;
    void recordFreeRecommendCall(auth.customerId, latencyMs, result.returned);
    return {
      content: [{ type: 'text', text: formatRecommendText(result, consume.status.resetsOn) }],
      structuredContent: result as unknown as Record<string, unknown>,
    };
  } catch (err) {
    // Don't burn the user's one free report on our failure.
    await refundFreeRecommend(auth.customerId).catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return toolError(`Keyword research failed (${message}). Your free report was not counted — please try again.`);
  }
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

/** Human-readable summary of a recommend result for the ChatGPT transcript. */
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
  resetsOn: string,
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
  lines.push('');
  lines.push(`This was your free monthly report. Your free allowance resets ${resetsOn}.`);
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
