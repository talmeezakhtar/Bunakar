import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Design } from './entities/design.entity';
import { CreateDesignDto } from './dto/create-design.dto';
import { MaterialsService } from '../materials/materials.service';
import { estimatePrice } from './pricing';
import { renderDesignSpecSheet } from './pdf/design-pdf';

@Injectable()
export class DesignsService {
  constructor(
    @InjectRepository(Design) private readonly designs: Repository<Design>,
    private readonly materialsService: MaterialsService,
  ) {}

  async create(sellerId: string, dto: CreateDesignDto) {
    const material = await this.materialsService.findMaterial(dto.materialId);
    const pileType = await this.materialsService.findPileType(dto.pileTypeId);

    const priceEstimate = estimatePrice({
      widthFt: dto.widthFt,
      heightFt: dto.heightFt,
      material: material.name,
      pileType: pileType.name,
      borderCount: dto.borders.length,
      medallionEnabled: dto.medallionEnabled,
    });

    const design = this.designs.create({
      ...dto,
      medallionPatternId: dto.medallionPatternId ?? null,
      medallionColorId: dto.medallionColorId ?? null,
      medallionScale: dto.medallionScale ?? 1,
      sellerId,
      priceEstimate,
    });
    return this.designs.save(design);
  }

  findAllForSeller(sellerId: string) {
    return this.designs.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const design = await this.designs.findOne({
      where: { id },
      relations: {
        fieldColor: true,
        fieldPattern: true,
        material: true,
        pileType: true,
        borders: true,
      },
    });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return design;
  }

  async generatePdf(id: string) {
    const design = await this.findOne(id);
    return renderDesignSpecSheet(design);
  }
}
