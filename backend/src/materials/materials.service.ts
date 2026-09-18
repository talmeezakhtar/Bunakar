import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { PileType } from './entities/pile-type.entity';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(Material)
    private readonly materials: Repository<Material>,
    @InjectRepository(PileType)
    private readonly pileTypes: Repository<PileType>,
  ) {}

  findAllMaterials() {
    return this.materials.find();
  }

  async findMaterial(id: string) {
    const material = await this.materials.findOne({ where: { id } });
    if (!material) throw new NotFoundException(`Material ${id} not found`);
    return material;
  }

  findAllPileTypes() {
    return this.pileTypes.find();
  }

  async findPileType(id: string) {
    const pileType = await this.pileTypes.findOne({ where: { id } });
    if (!pileType) throw new NotFoundException(`Pile type ${id} not found`);
    return pileType;
  }
}
