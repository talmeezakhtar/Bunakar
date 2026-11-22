import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwatchesModule } from '../swatches/swatches.module';
import { FreeformDesignsController } from './freeform-designs.controller';
import { FreeformDesignsService } from './freeform-designs.service';
import { FreeformDesign } from './entities/freeform-design.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FreeformDesign]), SwatchesModule],
  controllers: [FreeformDesignsController],
  providers: [FreeformDesignsService],
})
export class FreeformDesignsModule {}
