import type { NextFunction, Request, Response } from 'express';

/**
 * Express middleware: at most `max` writes (POST, PUT, PATCH, DELETE) per client IP per
 * `windowMs`, checked before any request body is read. A backstop against scripted floods;
 * the per-route guards (login, forms) are much tighter.
 */
// ponytail: in-memory, per instance - fine for one instance.
export function writeRateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      req.method === 'GET' ||
      req.method === 'HEAD' ||
      req.method === 'OPTIONS'
    )
      return next();
    const now = Date.now();
    if (hits.size > 10_000)
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    const key = req.ip ?? '';
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Try again in a few minutes.',
      });
      return;
    }
    entry.count += 1;
    next();
  };
}
