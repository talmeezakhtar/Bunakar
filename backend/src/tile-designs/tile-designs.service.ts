import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TileDesign } from './entities/tile-design.entity';
import { CreateTileDesignDto } from './dto/create-tile-design.dto';
import { UpdateTileDesignDto } from './dto/update-tile-design.dto';

@Injectable()
export class TileDesignsService {
  constructor(
    @InjectRepository(TileDesign)
    private readonly tileDesigns: Repository<TileDesign>,
  ) {}

  create(userId: string, dto: CreateTileDesignDto) {
    return this.tileDesigns.save(this.tileDesigns.create({ ...dto, userId }));
  }

  findAllForUser(userId: string) {
    return this.tileDesigns.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string) {
    const design = await this.tileDesigns.findOne({ where: { id } });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return design;
  }

  async update(id: string, userId: string, dto: UpdateTileDesignDto) {
    const design = await this.findOne(id);
    if (design.userId !== userId) throw new ForbiddenException();
    Object.assign(design, dto);
    return this.tileDesigns.save(design);
  }

  async remove(id: string, userId: string) {
    const design = await this.findOne(id);
    if (design.userId !== userId) throw new ForbiddenException();
    await this.tileDesigns.remove(design);
  }
}
