import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Swatch } from './entities/swatch.entity';
import { SWATCH_SEED } from './swatches.seed';

@Injectable()
export class SwatchesService implements OnModuleInit {
  private readonly logger = new Logger(SwatchesService.name);
  /** uuid -> code, for clients that still send the old uuid ids. */
  private codeByUuid = new Map<string, string>();

  constructor(
    @InjectRepository(Swatch) private readonly swatches: Repository<Swatch>,
  ) {}

  /** Adds any seed swatch not yet in the table (matched on family + color), so styles added to
   * the seed later reach databases that were seeded before them. Existing rows are left alone. */
  async onModuleInit() {
    const existing = await this.swatches.find();
    const have = new Set(existing.map((s) => `${s.familyId}/${s.colorName}`));
    const missing = SWATCH_SEED.filter(
      (s) => !have.has(`${s.familyId}/${s.colorName}`),
    );
    if (missing.length > 0) {
      existing.push(
        ...(await this.swatches.save(this.swatches.create(missing))),
      );
      this.logger.log(`Seeded ${missing.length} swatches`);
    }
    this.codeByUuid = new Map(existing.map((s) => [s.id, s.code]));
  }

  /** In seed order. The code is the public id; the uuid never leaves the server. */
  async findAll() {
    const rank = new Map(SWATCH_SEED.map((s, i) => [s.code, i]));
    const at = (s: Swatch) => rank.get(s.code) ?? SWATCH_SEED.length;
    const rows = await this.swatches.find();
    return rows
      .sort((a, b) => at(a) - at(b))
      .map(({ code, ...rest }) => ({ ...rest, id: code }));
  }

  /** Accepts a code or a legacy uuid and returns the code; unknown ids pass through as-is. */
  toCode = (id: string) => this.codeByUuid.get(id) ?? id;
}
