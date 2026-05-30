/**
 * API key authentication middleware for the public /v1 API.
 *
 * Expects an `Authorization: Bearer jk_live_<...>` header.
 * Loads the customer record onto req.apiCustomer for downstream handlers.
 * 401 if no key / invalid key / revoked key / no customer.
 *
 * Also attaches req.apiSource — server-derived from the User-Agent so the
 * caller can't lie about which surface they're using. "mcp" when the request
 * came through our published MCP server, "api" otherwise. Used purely for
 * source-attribution rollups on the seller dashboard; never affects auth or
 * billing behavior.
 */

import * as crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  getCustomerByApiKey,
  getApiCustomerById,
  coerceApiSource,
  type ApiCustomer,
  type ApiSource,
} from '../services/apiCredits';

const MCP_USER_AGENT_PREFIX = 'jackpotkeywords-mcp-server';

// Shared secret used by the trusted async job worker to invoke a customer's
// sync endpoint on their behalf. We never store raw API keys, so the worker
// authenticates by secret + explicit customer id instead. Empty = disabled.
const INTERNAL_JOB_SECRET = process.env.JK_INTERNAL_JOB_SECRET || '';

// RapidAPI marketplace path. RapidAPI's Rapid Runtime proxies every consumer
// request and appends a per-API X-RapidAPI-Proxy-Secret header; we validate it
// so the direct Cloud Function URL can't be hit to impersonate RapidAPI and get
// billing-exempt calls. RapidAPI is the ledger for this surface, so all such
// requests resolve to ONE pre-provisioned billing-exempt "house" customer
// rather than a per-developer jk_live_ key. Both empty = RapidAPI path disabled.
const RAPIDAPI_PROXY_SECRET = process.env.JK_RAPIDAPI_PROXY_SECRET || '';
const RAPIDAPI_HOUSE_CUSTOMER_ID = process.env.JK_RAPIDAPI_HOUSE_CUSTOMER_ID || '';

/** Constant-time string compare that won't throw on length mismatch. */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export interface ApiKeyRequest extends Request {
  apiCustomer?: ApiCustomer;
  apiSource?: ApiSource;
}

function resolveApiSource(userAgent: string | string[] | undefined): ApiSource {
  const ua = (Array.isArray(userAgent) ? userAgent[0] : userAgent) ?? '';
  return ua.toLowerCase().startsWith(MCP_USER_AGENT_PREFIX) ? 'mcp' : 'api';
}

export async function apiKeyAuth(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Internal trusted call: the async job worker invoking a sync endpoint on a
  // customer's behalf. Gated on the shared secret matching AND being configured
  // (an unset/empty secret can never match an empty header). Source is taken
  // from an explicit header so attribution can reflect the originating surface
  // (e.g. zapier) once ApiSource is widened — coerces to 'api' today.
  const internalSecret = req.headers['x-internal-secret'];
  if (
    INTERNAL_JOB_SECRET &&
    typeof internalSecret === 'string' &&
    internalSecret === INTERNAL_JOB_SECRET
  ) {
    const customerId = String(req.headers['x-api-customer-id'] || '');
    const customer = await getApiCustomerById(customerId);
    if (!customer) {
      res.status(401).json({
        error: 'invalid_internal_customer',
        message: 'Unknown customer for internal call.',
      });
      return;
    }
    req.apiCustomer = customer;
    req.apiSource = coerceApiSource(req.headers['x-api-source']);
    next();
    return;
  }

  // RapidAPI gateway call: the proxy-secret header's PRESENCE is the switch.
  // Present + valid → bind the billing-exempt house account. Present + invalid
  // (or path unconfigured) → 401, never fall through. Absent → fall through to
  // the jk_live_ Bearer path below, leaving MCP/n8n/direct traffic untouched.
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  if (typeof proxySecret === 'string') {
    if (
      !RAPIDAPI_PROXY_SECRET ||
      !RAPIDAPI_HOUSE_CUSTOMER_ID ||
      !timingSafeEqualStr(proxySecret, RAPIDAPI_PROXY_SECRET)
    ) {
      res.status(401).json({
        error: 'invalid_proxy_secret',
        message: 'Request did not originate from the RapidAPI gateway.',
      });
      return;
    }
    const houseCustomer = await getApiCustomerById(RAPIDAPI_HOUSE_CUSTOMER_ID);
    if (!houseCustomer) {
      res.status(401).json({
        error: 'rapidapi_house_unconfigured',
        message: 'RapidAPI house account is not provisioned.',
      });
      return;
    }
    req.apiCustomer = houseCustomer;
    req.apiSource = 'rapidapi';
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'missing_api_key',
      message: 'Provide your API key as Authorization: Bearer jk_live_<key>',
    });
    return;
  }

  const rawKey = authHeader.slice('Bearer '.length).trim();
  const customer = await getCustomerByApiKey(rawKey);
  if (!customer) {
    res.status(401).json({
      error: 'invalid_api_key',
      message: 'API key not recognized or revoked',
    });
    return;
  }

  req.apiCustomer = customer;
  req.apiSource = resolveApiSource(req.headers['user-agent']);
  next();
}
