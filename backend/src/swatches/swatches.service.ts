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

  async onModuleInit() {
    const count = await this.swatches.count();
    if (count === 0) {
      await this.swatches.save(this.swatches.create(SWATCH_SEED));
      this.logger.log(`Seeded ${SWATCH_SEED.length} swatches`);
    }
  }

  findAll() {
    return this.swatches.find();
  }
}
