import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';

const BLOCKED_METHODS = new Set(['TRACE']);

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
}

export function blockUnsafeMethods(req: Request, res: Response, next: NextFunction): void {
  if (BLOCKED_METHODS.has(req.method.toUpperCase())) {
    res.status(405).json({ error: 'HTTP method is not allowed.' });
    return;
  }

  next();
}

export const jsonBodyErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({ error: 'Request body too large.' });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON request body.' });
    return;
  }

  next(err);
};
