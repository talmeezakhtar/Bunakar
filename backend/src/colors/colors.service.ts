import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './entities/color.entity';
import { CreateColorDto } from './dto/create-color.dto';

@Injectable()
export class ColorsService {
  constructor(
    @InjectRepository(Color) private readonly colors: Repository<Color>,
  ) {}

  findAll() {
    return this.colors.find();
  }

  async findOne(id: string) {
    const color = await this.colors.findOne({ where: { id } });
    if (!color) throw new NotFoundException(`Color ${id} not found`);
    return color;
  }

  create(dto: CreateColorDto) {
    return this.colors.save(this.colors.create(dto));
  }
}
