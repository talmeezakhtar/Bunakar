import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreeformDesign } from './entities/freeform-design.entity';
import { CreateFreeformDesignDto } from './dto/create-freeform-design.dto';
import { UpdateFreeformDesignDto } from './dto/create-freeform-design.dto';

@Injectable()
export class FreeformDesignsService {
  constructor(
    @InjectRepository(FreeformDesign)
    private readonly freeformDesigns: Repository<FreeformDesign>,
  ) {}

  create(userId: string, dto: CreateFreeformDesignDto) {
    return this.freeformDesigns.save(
      this.freeformDesigns.create({ ...dto, userId }),
    );
  }

  findAllForUser(userId: string) {
    return this.freeformDesigns.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /** Another user's design is reported as missing, so ids don't reveal what exists. */
  async findOne(id: string, userId: string) {
    const design = await this.freeformDesigns.findOne({
      where: { id, userId },
    });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return design;
  }

  /** Read-only view for shared preview links: anyone with the (unguessable) id may look,
   * without learning who owns it. Editing still goes through the owner-only routes. */
  async findPublic(id: string) {
    const design = await this.freeformDesigns.findOne({ where: { id } });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return { ...design, userId: undefined };
  }

  async update(id: string, userId: string, dto: UpdateFreeformDesignDto) {
    const design = await this.findOne(id, userId);
    Object.assign(design, dto);
    return this.freeformDesigns.save(design);
  }

  async remove(id: string, userId: string) {
    await this.freeformDesigns.remove(await this.findOne(id, userId));
  }
}
