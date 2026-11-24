import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;
/** Compared against when the email is unknown, so a wrong email takes as long as a wrong
 * password and response times don't reveal which accounts exist. */
const DUMMY_HASH = bcrypt.hashSync('no account has this password', SALT_ROUNDS);

/** Postgres `unique_violation`; TypeORM's QueryFailedError carries the driver's code. */
function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; driverError?: { code?: string } } | null;
  return e?.code === '23505' || e?.driverError?.code === '23505';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  /** Case-insensitive, so accounts created before emails were lowercased still match. */
  private findByEmail(email: string) {
    return this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async register(dto: RegisterDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    try {
      const user = await this.users.save(
        this.users.create({ email: dto.email, name: dto.name, passwordHash }),
      );
      return this.signToken(user);
    } catch (err) {
      // Two sign-ups racing past the check above: the unique index catches the second.
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.findByEmail(dto.email);
    const ok = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !ok) {
      throw new UnauthorizedException('Wrong email or password');
    }
    // Hashes made with fewer rounds are upgraded the next time the password is known.
    if (bcrypt.getRounds(user.passwordHash) < SALT_ROUNDS) {
      user.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
      await this.users.update(user.id, { passwordHash: user.passwordHash });
    }
    return this.signToken(user);
  }

  /** A fresh token for a signed-in visitor, so an active session doesn't run out. */
  async refresh(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return this.signToken(user);
  }

  /** Ends every session of this account: tokens issued before now stop working. */
  async logout(userId: string) {
    await this.users.increment({ id: userId }, 'tokenVersion', 1);
  }

  /** Whether a token issued at `version` is still current for this account. */
  async isTokenCurrent(userId: string, version: number) {
    const user = await this.users.findOne({
      select: { id: true, tokenVersion: true },
      where: { id: userId },
    });
    return !!user && user.tokenVersion === version;
  }

  /** Session restore: the token was valid, but the account behind it must still exist. */
  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return this.toPublicUser(user);
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    };
  }

  private signToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      ver: user.tokenVersion ?? 0,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.toPublicUser(user),
    };
  }
}
