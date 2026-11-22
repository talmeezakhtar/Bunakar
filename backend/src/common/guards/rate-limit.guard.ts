import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Caps how often one client may hit an endpoint: `max` requests per `windowMs` for each key
 * (`keyOf` picks what counts as "one client"). Answers 429 with how long to wait.
 */
// ponytail: in-memory and per server instance - move to @nestjs/throttler with a Redis store
// once the backend runs on more than one instance.
export abstract class RateLimitGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  protected abstract keyOf(req: Request): string;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = this.keyOf(req);
    const now = Date.now();

    if (this.attempts.size > 10_000) {
      for (const [k, v] of this.attempts)
        if (v.resetAt <= now) this.attempts.delete(k);
    }

    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.max) {
      const minutes = Math.ceil((entry.resetAt - now) / 60_000);
      throw new HttpException(
        `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    entry.count += 1;
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
