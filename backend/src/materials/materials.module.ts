import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { Material } from './entities/material.entity';
import { PileType } from './entities/pile-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, PileType])],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
