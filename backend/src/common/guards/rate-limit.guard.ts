import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Caps how often one client may hit an endpoint. Each request counts against one or more buckets
 * (`limits`: a key, the most requests allowed and the window); if any bucket is full the request
 * is refused with 429 and how long to wait. Subclasses give either `keyOf` (one bucket of
 * `max` per `windowMs`) or their own `limits`.
 */
// ponytail: in-memory and per server instance - move to @nestjs/throttler with a Redis store
// once the backend runs on more than one instance.
export abstract class RateLimitGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly max = 0,
    private readonly windowMs = 0,
  ) {}

  protected keyOf(req: Request): string {
    void req;
    throw new Error('RateLimitGuard needs keyOf or limits');
  }

  protected limits(
    req: Request,
  ): [key: string, max: number, windowMs: number][] {
    return [[this.keyOf(req), this.max, this.windowMs]];
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const now = Date.now();

    if (this.attempts.size > 10_000) {
      for (const [k, v] of this.attempts)
        if (v.resetAt <= now) this.attempts.delete(k);
    }

    const buckets = this.limits(req).map(([key, max, windowMs]) => {
      let entry = this.attempts.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        this.attempts.set(key, entry);
      }
      return { entry, max };
    });
    const full = buckets.find((b) => b.entry.count >= b.max);
    if (full) {
      const minutes = Math.ceil((full.entry.resetAt - now) / 60_000);
      throw new HttpException(
        `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    for (const b of buckets) b.entry.count += 1;
    return true;
  }
}

/** Public forms (contact, upgrade requests): a few per client per hour. */
@Injectable()
export class FormRateLimitGuard extends RateLimitGuard {
  constructor() {
    super(5, 60 * 60 * 1000);
  }

  protected keyOf(req: Request) {
    return `${req.path}|${req.ip}`;
  }
}
