import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwatchesController } from './swatches.controller';
import { SwatchesService } from './swatches.service';
import { Swatch } from './entities/swatch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Swatch])],
  controllers: [SwatchesController],
  providers: [SwatchesService],
})
export class SwatchesModule {}
