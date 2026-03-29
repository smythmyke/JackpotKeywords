import * as admin from 'firebase-admin';
import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth — sets userId if token is present, but doesn't reject if missing
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.userId = decoded.uid;
      req.userEmail = decoded.email;
    } catch {
      // Invalid token — proceed as anonymous
    }
  }
  next();
}
