import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';

// @nestjs/jwt and @nestjs/typeorm v12 ship ESM only, which this Jest setup can't load.
// InjectRepository is only a DI decorator here; the repository is passed in by hand.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
// @nestjs/jwt is a thin wrapper over jsonwebtoken, so stand in with the same library -
// signing and verifying stay real.
jest.mock('@nestjs/jwt', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsonwebtoken = require('jsonwebtoken') as typeof import('jsonwebtoken');
  return {
    JwtService: class {
      constructor(
        private readonly opts: { secret: string; signOptions?: object },
      ) {}
      sign(payload: object) {
        return jsonwebtoken.sign(
          payload,
          this.opts.secret,
          this.opts.signOptions,
        );
      }
      verify(token: string) {
        return jsonwebtoken.verify(token, this.opts.secret);
      }
    },
  };
});

/** In-memory stand-in for the TypeORM repository - just the calls AuthService makes. */
function fakeUsers() {
  const rows: User[] = [];
  return {
    rows,
    create: (data: Partial<User>) => data as User,
    save: (u: User) => {
      const saved = {
        ...u,
        id: `u${rows.length + 1}`,
        role: UserRole.SELLER,
        createdAt: new Date(),
      };
      rows.push(saved);
      return Promise.resolve(saved);
    },
    findOne: ({ where }: { where: { id: string } }) =>
      Promise.resolve(rows.find((r) => r.id === where.id) ?? null),
    createQueryBuilder: () => {
      let email = '';
      const qb = {
        where: (_sql: string, params: { email: string }) => {
          email = params.email;
          return qb;
        },
        getOne: () =>
          Promise.resolve(
            rows.find((r) => r.email.toLowerCase() === email) ?? null,
          ),
      };
      return qb;
    },
  };
}

describe('AuthService (JWT)', () => {
  const jwt = new JwtService({
    secret: 'test-secret',
    signOptions: { expiresIn: '7d' },
  });
  let users: ReturnType<typeof fakeUsers>;
  let service: AuthService;

  beforeEach(() => {
    users = fakeUsers();
    service = new AuthService(users as never, jwt);
  });

  it('registers, hashes the password and returns a verifiable 7-day token', async () => {
    const res = await service.register({
      email: 'ali@example.com',
      password: 'open-sesame',
      name: 'Ali',
    });
    expect(users.rows[0].passwordHash).not.toBe('open-sesame');
    const payload = jwt.verify<{
      sub: string;
      email: string;
      exp: number;
      iat: number;
    }>(res.accessToken);
    expect(payload.sub).toBe(res.user.id);
    expect(payload.exp - payload.iat).toBe(7 * 24 * 3600);
    expect(res.user).not.toHaveProperty('passwordHash');
  });

  it('logs in case-insensitively and rejects a wrong password', async () => {
    await service.register({
      email: 'ali@example.com',
      password: 'open-sesame',
      name: 'Ali',
    });
    await expect(
      service.login({ email: 'ALI@example.com', password: 'open-sesame' }),
    ).resolves.toHaveProperty('accessToken');
    await expect(
      service.login({ email: 'ali@example.com', password: 'nope' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.login({ email: 'who@example.com', password: 'open-sesame' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a duplicate email regardless of case', async () => {
    await service.register({
      email: 'ali@example.com',
      password: 'open-sesame',
      name: 'Ali',
    });
    await expect(
      service.register({
        email: 'Ali@Example.com',
        password: 'open-sesame',
        name: 'Ali 2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('me() returns the account behind a token, and 401s once it is gone', async () => {
    const { user } = await service.register({
      email: 'ali@example.com',
      password: 'open-sesame',
      name: 'Ali',
    });
    await expect(service.me(user.id)).resolves.toEqual(user);
    users.rows.length = 0;
    await expect(service.me(user.id)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('a token signed with another secret does not verify', () => {
    const forged = new JwtService({ secret: 'attacker' }).sign({ sub: 'u1' });
    expect(() => {
      jwt.verify(forged);
    }).toThrow();
  });
});
