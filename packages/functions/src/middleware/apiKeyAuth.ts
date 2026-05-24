/**
 * API key authentication middleware for the public /v1 API.
 *
 * Expects an `Authorization: Bearer jk_live_<...>` header.
 * Loads the customer record onto req.apiCustomer for downstream handlers.
 * 401 if no key / invalid key / revoked key / no customer.
 */

import type { Request, Response, NextFunction } from 'express';
import { getCustomerByApiKey, type ApiCustomer } from '../services/apiCredits';

export interface ApiKeyRequest extends Request {
  apiCustomer?: ApiCustomer;
}

export async function apiKeyAuth(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
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
  next();
}
