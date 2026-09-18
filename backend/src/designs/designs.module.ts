import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';
import { Design } from './entities/design.entity';
import { DesignBorder } from './entities/design-border.entity';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [TypeOrmModule.forFeature([Design, DesignBorder]), MaterialsModule],
  controllers: [DesignsController],
  providers: [DesignsService],
})
export class DesignsModule {}
