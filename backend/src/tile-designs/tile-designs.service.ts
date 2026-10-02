import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.tileDesigns.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /** Another user's design is reported as missing, so ids don't reveal what exists. */
  async findOne(id: string, userId: string) {
    const design = await this.tileDesigns.findOne({ where: { id, userId } });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return design;
  }

  /** Read-only view for shared preview links: anyone with the (unguessable) id may look,
   * without learning who owns it. Editing still goes through the owner-only routes. */
  async findPublic(id: string) {
    const design = await this.tileDesigns.findOne({ where: { id } });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return { ...design, userId: undefined };
  }

  async update(id: string, userId: string, dto: UpdateTileDesignDto) {
    const design = await this.findOne(id, userId);
    Object.assign(design, dto);
    return this.tileDesigns.save(design);
  }

  async remove(id: string, userId: string) {
    await this.tileDesigns.remove(await this.findOne(id, userId));
  }
}
