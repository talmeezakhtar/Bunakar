import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Caps login/register attempts per client IP + email, so a password can't be guessed by
 * hammering the endpoint.
 */
// ponytail: in-memory and per server instance - move to @nestjs/throttler with a Redis store
// once the backend runs on more than one instance.
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const key = `${req.path}|${req.ip}|${email}`;
    const now = Date.now();

    if (this.attempts.size > 10_000) {
      for (const [k, v] of this.attempts)
        if (v.resetAt <= now) this.attempts.delete(k);
    }

    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }
    if (entry.count >= MAX_ATTEMPTS) {
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
