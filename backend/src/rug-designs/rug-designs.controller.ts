import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RugDesignsService } from './rug-designs.service';
import { CreateRugDesignDto, UpdateRugDesignDto } from './dto/rug-design.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

// Designs are private to their owner, except the read-only public view behind share links.
@Controller('rug-designs')
export class RugDesignsController {
  constructor(private readonly rugDesignsService: RugDesignsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRugDesignDto,
  ) {
    return this.rugDesignsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('summary') summary?: string,
  ) {
    // ?summary=1 lists without the design bodies; without it, the full designs as before.
    return summary === '1' || summary === 'true'
      ? this.rugDesignsService.findSummaries(user.userId)
      : this.rugDesignsService.findAllForUser(user.userId);
  }

  @Get(':id/public')
  findPublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.rugDesignsService.findPublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rugDesignsService.findOne(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRugDesignDto,
  ) {
    return this.rugDesignsService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rugDesignsService.remove(id, user.userId);
  }
}
