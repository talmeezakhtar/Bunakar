import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TileDesignsController } from './tile-designs.controller';
import { TileDesignsService } from './tile-designs.service';
import { TileDesign } from './entities/tile-design.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TileDesign])],
  controllers: [TileDesignsController],
  providers: [TileDesignsService],
})
export class TileDesignsModule {}
