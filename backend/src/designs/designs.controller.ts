import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DesignsService } from './designs.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDesignDto) {
    return this.designsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.designsService.findAllForSeller(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.designsService.findOne(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.designsService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="design-${id}.pdf"`,
    );
    doc.pipe(res);
  }
}
