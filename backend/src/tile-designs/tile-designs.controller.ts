import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TileDesignsService } from './tile-designs.service';
import { CreateTileDesignDto } from './dto/create-tile-design.dto';
import { UpdateTileDesignDto } from './dto/update-tile-design.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('tile-designs')
export class TileDesignsController {
  constructor(private readonly tileDesignsService: TileDesignsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTileDesignDto) {
    return this.tileDesignsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.tileDesignsService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tileDesignsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTileDesignDto,
  ) {
    return this.tileDesignsService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tileDesignsService.remove(id, user.userId);
  }
}
