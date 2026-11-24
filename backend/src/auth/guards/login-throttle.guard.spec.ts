import { ExecutionContext, HttpException } from '@nestjs/common';
import { LoginThrottleGuard } from './login-throttle.guard';

function ctx(email: string, ip = '1.2.3.4'): ExecutionContext {
  const req = { path: '/auth/login', ip, body: { email } };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('LoginThrottleGuard', () => {
  it('allows 10 attempts per ip+email, then refuses with 429', () => {
    const guard = new LoginThrottleGuard();
    for (let i = 0; i < 10; i++)
      expect(guard.canActivate(ctx('a@x.com'))).toBe(true);
    expect(() => guard.canActivate(ctx('A@x.com '))).toThrow(HttpException);
    // A different account or client is counted separately.
    expect(guard.canActivate(ctx('b@x.com'))).toBe(true);
    expect(guard.canActivate(ctx('a@x.com', '5.6.7.8'))).toBe(true);
  });

  it('opens up again once the window has passed', () => {
    const guard = new LoginThrottleGuard();
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    for (let i = 0; i < 10; i++) guard.canActivate(ctx('a@x.com'));
    expect(() => guard.canActivate(ctx('a@x.com'))).toThrow(HttpException);
    now.mockReturnValue(15 * 60 * 1000 + 1);
    expect(guard.canActivate(ctx('a@x.com'))).toBe(true);
    now.mockRestore();
  });

  const at = (path: string, ip: string, email: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ path, ip, body: { email } }),
      }),
    }) as unknown as ExecutionContext;

  it('caps sign-ups from one IP even when every email is new', () => {
    const guard = new LoginThrottleGuard();
    for (let i = 0; i < 5; i++)
      expect(
        guard.canActivate(at('/auth/register', '1.2.3.4', `a${i}@x.io`)),
      ).toBe(true);
    expect(() =>
      guard.canActivate(at('/auth/register', '1.2.3.4', 'a9@x.io')),
    ).toThrow(HttpException);
    expect(guard.canActivate(at('/auth/register', '5.6.7.8', 'b@x.io'))).toBe(
      true,
    );
  });

  it('caps logins to one account from many IPs', () => {
    const guard = new LoginThrottleGuard();
    for (let i = 0; i < 30; i++)
      expect(
        guard.canActivate(at('/auth/login', `10.0.0.${i}`, 'victim@x.io')),
      ).toBe(true);
    expect(() =>
      guard.canActivate(at('/auth/login', '10.0.1.1', 'victim@x.io')),
    ).toThrow(HttpException);
  });
});
