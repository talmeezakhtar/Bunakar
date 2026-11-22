import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignsService } from '../common/designs/designs.service';
import {
  mapFreeformSwatchIds,
  SwatchIdMap,
} from '../common/designs/swatch-ids';
import { DesignQuotaService } from '../common/designs/design-quota.service';
import { SwatchesService } from '../swatches/swatches.service';
import { FreeformDesign } from './entities/freeform-design.entity';
import { CreateFreeformDesignDto } from './dto/create-freeform-design.dto';

@Injectable()
export class FreeformDesignsService extends DesignsService<
  FreeformDesign,
  CreateFreeformDesignDto
> {
  protected readonly kind = 'freeform';
  protected readonly sizeColumns: (keyof FreeformDesign)[] = [
    'widthFt',
    'heightFt',
  ];

  constructor(
    @InjectRepository(FreeformDesign) repo: Repository<FreeformDesign>,
    swatches: SwatchesService,
    quota: DesignQuotaService,
  ) {
    super(repo, swatches, quota);
  }

  protected size(row: FreeformDesign) {
    return { widthFt: row.widthFt, heightFt: row.heightFt };
  }

  protected mapSwatchIds(dto: CreateFreeformDesignDto, map: SwatchIdMap) {
    return mapFreeformSwatchIds(dto, map);
  }
}
