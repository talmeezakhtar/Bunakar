import type { NextFunction, Request, Response } from 'express';
import { writeRateLimit } from './write-rate-limit';

describe('writeRateLimit', () => {
  const res = () => {
    const status = jest.fn();
    const r = { status, json: jest.fn() };
    status.mockReturnValue(r);
    return { res: r as unknown as Response, status };
  };

  it('lets reads through and refuses writes past the cap', () => {
    const limit = writeRateLimit(2, 60_000);
    const next = jest.fn() as NextFunction;
    const req = (method: string) => ({ method, ip: '1.1.1.1' }) as Request;
    limit(req('POST'), res().res, next);
    limit(req('PUT'), res().res, next);
    limit(req('GET'), res().res, next);
    expect(next).toHaveBeenCalledTimes(3);
    const refused = res();
    limit(req('POST'), refused.res, next);
    expect(refused.status).toHaveBeenCalledWith(429);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
