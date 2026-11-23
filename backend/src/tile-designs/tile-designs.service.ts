import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignsService } from '../common/designs/designs.service';
import { mapTileSwatchIds, SwatchIdMap } from '../common/designs/swatch-ids';
import { DesignQuotaService } from '../common/designs/design-quota.service';
import { SwatchesService } from '../swatches/swatches.service';
import { TileDesign } from './entities/tile-design.entity';
import { CreateTileDesignDto } from './dto/create-tile-design.dto';

/** One carpet tile is 18 inches square. */
const TILE_FT = 1.5;

@Injectable()
export class TileDesignsService extends DesignsService<
  TileDesign,
  CreateTileDesignDto
> {
  protected readonly kind = 'tile';
  protected readonly sizeColumns: (keyof TileDesign)[] = [
    'widthTiles',
    'heightTiles',
  ];

  constructor(
    @InjectRepository(TileDesign) repo: Repository<TileDesign>,
    swatches: SwatchesService,
    quota: DesignQuotaService,
  ) {
    super(repo, swatches, quota);
  }

  protected size(row: TileDesign) {
    return {
      widthFt: row.widthTiles * TILE_FT,
      heightFt: row.heightTiles * TILE_FT,
    };
  }

  protected mapSwatchIds(dto: CreateTileDesignDto, map: SwatchIdMap) {
    return mapTileSwatchIds(dto, map);
  }
}
