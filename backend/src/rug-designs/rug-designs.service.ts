import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignsService } from '../common/designs/designs.service';
import { mapDocSwatchIds, SwatchIdMap } from '../common/designs/swatch-ids';
import { DesignQuotaService } from '../common/designs/design-quota.service';
import { SwatchesService } from '../swatches/swatches.service';
import { RugDesign } from './entities/rug-design.entity';
import { CreateRugDesignDto } from './dto/rug-design.dto';

@Injectable()
export class RugDesignsService extends DesignsService<
  RugDesign,
  CreateRugDesignDto
> {
  protected readonly kind = 'studio';
  protected readonly sizeColumns: (keyof RugDesign)[] = ['widthFt', 'heightFt'];

  constructor(
    @InjectRepository(RugDesign) repo: Repository<RugDesign>,
    swatches: SwatchesService,
    quota: DesignQuotaService,
  ) {
    super(repo, swatches, quota);
  }

  protected size(row: RugDesign) {
    return { widthFt: row.widthFt, heightFt: row.heightFt };
  }

  protected mapSwatchIds(dto: CreateRugDesignDto, map: SwatchIdMap) {
    return mapDocSwatchIds(dto, map);
  }
}
