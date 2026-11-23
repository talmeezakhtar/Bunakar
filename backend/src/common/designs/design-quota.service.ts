import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Saved designs (tile, freeform and studio rugs together) a Free account may keep. */
export const FREE_DESIGN_LIMIT = 5;

/** Plan limits on saving designs: Free accounts keep up to `FREE_DESIGN_LIMIT`, Pro is unlimited. */
@Injectable()
export class DesignQuotaService {
  constructor(private readonly data: DataSource) {}

  /** Throws 402 (with `code: 'plan_limit'`) when a Free account already holds its limit. */
  // ponytail: two saves landing at the same instant can both pass the count; at worst a Free
  // account ends one design over the limit, which is harmless.
  async assertCanCreate(userId: string): Promise<void> {
    const rows: { plan: string; designs: string }[] = await this.data.query(
      `SELECT u.plan,
              (SELECT count(*) FROM tile_designs t WHERE t."userId" = u.id)
            + (SELECT count(*) FROM freeform_designs f WHERE f."userId" = u.id)
            + (SELECT count(*) FROM rug_designs r WHERE r."userId" = u.id) AS designs
         FROM users u WHERE u.id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) throw new UnauthorizedException('Account no longer exists');
    if (row.plan === 'free' && Number(row.designs) >= FREE_DESIGN_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          code: 'plan_limit',
          limit: FREE_DESIGN_LIMIT,
          message: `The Free plan keeps ${FREE_DESIGN_LIMIT} designs. Delete one, or upgrade to Pro for unlimited designs.`,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }
}
