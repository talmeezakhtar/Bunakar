import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Swatch } from './entities/swatch.entity';
import { SWATCH_SEED } from './swatches.seed';

@Injectable()
export class SwatchesService implements OnModuleInit {
  private readonly logger = new Logger(SwatchesService.name);

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
    if (missing.length === 0) return;
    await this.swatches.save(this.swatches.create(missing));
    this.logger.log(`Seeded ${missing.length} swatches`);
  }

  findAll() {
    return this.swatches.find();
  }
}
