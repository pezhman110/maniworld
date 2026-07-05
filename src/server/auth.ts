import { NextFunction, Request, Response } from 'express';

/**
 * Minimal admin API-key auth middleware.
 *
 * The dashboard/API is meant for a handful of internal managers, not public
 * traffic, so a single shared admin key (checked via constant-time
 * comparison) is enough for now; swapping in per-user accounts/RBAC later
 * only requires replacing this middleware, not the routes.
 */
export function requireAdminApiKey(expectedKey?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expectedKey) {
      // No key configured: allow (development/local-only mode). A warning
      // is logged once at server startup in src/server/index.ts.
      next();
      return;
    }

    const provided = req.header('x-api-key');
    if (!provided || !timingSafeEqual(provided, expectedKey)) {
      res.status(401).json({ error: 'Missing or invalid x-api-key header.' });
      return;
    }
    next();
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
