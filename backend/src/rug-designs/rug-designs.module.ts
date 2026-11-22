import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwatchesModule } from '../swatches/swatches.module';
import { RugDesignsController } from './rug-designs.controller';
import { RugDesignsService } from './rug-designs.service';
import { RugDesign } from './entities/rug-design.entity';

/** Bunakar Studio rugs: one document per rug, any construction. */
@Module({
  imports: [TypeOrmModule.forFeature([RugDesign]), SwatchesModule],
  controllers: [RugDesignsController],
  providers: [RugDesignsService],
})
export class RugDesignsModule {}
