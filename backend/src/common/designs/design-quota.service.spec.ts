import { HttpException, UnauthorizedException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { DesignQuotaService, FREE_DESIGN_LIMIT } from './design-quota.service';

function quotaFor(rows: { plan: string; designs: string }[]) {
  const data = { query: jest.fn(() => Promise.resolve(rows)) };
  return new DesignQuotaService(data as unknown as DataSource);
}

describe('DesignQuotaService', () => {
  it('lets a Free account save until it holds the limit', async () => {
    await expect(
      quotaFor([
        { plan: 'free', designs: String(FREE_DESIGN_LIMIT - 1) },
      ]).assertCanCreate('u1'),
    ).resolves.toBeUndefined();
  });

  it('refuses a Free account at the limit with 402 and a plan_limit code', async () => {
    const err = await quotaFor([
      { plan: 'free', designs: String(FREE_DESIGN_LIMIT) },
    ])
      .assertCanCreate('u1')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(402);
    expect((err as HttpException).getResponse()).toMatchObject({
      code: 'plan_limit',
      limit: FREE_DESIGN_LIMIT,
    });
  });

  it('never limits Pro', async () => {
    await expect(
      quotaFor([{ plan: 'pro', designs: '500' }]).assertCanCreate('u1'),
    ).resolves.toBeUndefined();
  });

  it('rejects an account that no longer exists', async () => {
    await expect(quotaFor([]).assertCanCreate('gone')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
