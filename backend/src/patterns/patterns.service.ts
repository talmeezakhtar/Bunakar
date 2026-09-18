import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pattern } from './entities/pattern.entity';
import { CreatePatternDto } from './dto/create-pattern.dto';

@Injectable()
export class PatternsService {
  constructor(
    @InjectRepository(Pattern) private readonly patterns: Repository<Pattern>,
  ) {}

  findAll() {
    return this.patterns.find();
  }

  async findOne(id: string) {
    const pattern = await this.patterns.findOne({ where: { id } });
    if (!pattern) throw new NotFoundException(`Pattern ${id} not found`);
    return pattern;
  }

  create(dto: CreatePatternDto) {
    return this.patterns.save(this.patterns.create(dto));
  }
}
