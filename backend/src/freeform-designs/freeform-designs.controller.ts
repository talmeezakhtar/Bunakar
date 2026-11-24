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
import { FreeformDesignsService } from './freeform-designs.service';
import { CreateFreeformDesignDto } from './dto/create-freeform-design.dto';
import { UpdateFreeformDesignDto } from './dto/create-freeform-design.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShareDesignDto } from '../common/designs/share.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

// Designs are private to their owner, except the read-only public view behind share links.
@Controller('freeform-designs')
export class FreeformDesignsController {
  constructor(
    private readonly freeformDesignsService: FreeformDesignsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFreeformDesignDto,
  ) {
    return this.freeformDesignsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('summary') summary?: string,
  ) {
    // ?summary=1 lists without the design bodies; without it, the full designs as before.
    return summary === '1' || summary === 'true'
      ? this.freeformDesignsService.findSummaries(user.userId)
      : this.freeformDesignsService.findAllForUser(user.userId);
  }

  @Get(':id/public')
  findPublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.freeformDesignsService.findPublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.freeformDesignsService.findOne(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/share')
  share(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ShareDesignDto,
  ) {
    return this.freeformDesignsService.setShared(id, user.userId, dto.shared);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFreeformDesignDto,
  ) {
    return this.freeformDesignsService.update(id, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.freeformDesignsService.remove(id, user.userId);
  }
}
