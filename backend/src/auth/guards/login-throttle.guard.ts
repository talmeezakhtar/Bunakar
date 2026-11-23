import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

/**
 * Caps login/register attempts per client IP + email, so a password can't be guessed by
 * hammering the endpoint.
 */
@Injectable()
export class LoginThrottleGuard extends RateLimitGuard {
  constructor() {
    super(10, 15 * 60 * 1000);
  }

  protected keyOf(req: Request) {
    const body = req.body as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return `${req.path}|${req.ip}|${email}`;
  }
}
