import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PatternsService } from './patterns.service';
import { CreatePatternDto } from './dto/create-pattern.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('patterns')
export class PatternsController {
  constructor(private readonly patternsService: PatternsService) {}

  @Get()
  findAll() {
    return this.patternsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patternsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreatePatternDto) {
    return this.patternsService.create(dto);
  }
}
