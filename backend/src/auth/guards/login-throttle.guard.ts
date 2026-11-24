import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

const MIN = 60 * 1000;

/**
 * Caps login and register attempts so passwords can't be guessed by hammering the endpoint:
 * - per IP and email: 10 tries in 15 minutes (a person mistyping)
 * - per IP, any email: 50 logins in 15 minutes, 5 sign-ups an hour (password spraying, mass sign-up)
 * - per email, any IP: 30 logins an hour (one account attacked from many addresses)
 */
@Injectable()
export class LoginThrottleGuard extends RateLimitGuard {
  protected limits(req: Request): [string, number, number][] {
    const body = req.body as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const path = req.path;
    const ip = req.ip ?? '';
    const register = path.endsWith('/register');
    return [
      [`${path}|${ip}|${email}`, 10, 15 * MIN],
      register
        ? [`${path}|${ip}`, 5, 60 * MIN]
        : [`${path}|${ip}`, 50, 15 * MIN],
      ...(register
        ? []
        : [
            [`${path}|email|${email}`, 30, 60 * MIN] as [
              string,
              number,
              number,
            ],
          ]),
    ];
  }
}
