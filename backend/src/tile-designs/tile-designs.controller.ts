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
import { TileDesignsService } from './tile-designs.service';
import { CreateTileDesignDto } from './dto/create-tile-design.dto';
import { UpdateTileDesignDto } from './dto/update-tile-design.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShareDesignDto } from '../common/designs/share.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

// Designs are private to their owner, except the read-only public view behind share links.
@Controller('tile-designs')
export class TileDesignsController {
  constructor(private readonly tileDesignsService: TileDesignsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTileDesignDto,
  ) {
    return this.tileDesignsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('summary') summary?: string,
  ) {
    // ?summary=1 lists without the design bodies; without it, the full designs as before.
    return summary === '1' || summary === 'true'
      ? this.tileDesignsService.findSummaries(user.userId)
      : this.tileDesignsService.findAllForUser(user.userId);
  }

  @Get(':id/public')
  findPublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.tileDesignsService.findPublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tileDesignsService.findOne(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/share')
  share(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ShareDesignDto,
  ) {
    return this.tileDesignsService.setShared(id, user.userId, dto.shared);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTileDesignDto,
  ) {
    return this.tileDesignsService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tileDesignsService.remove(id, user.userId);
  }
}
