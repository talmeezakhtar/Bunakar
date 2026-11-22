import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { FormRateLimitGuard } from '../common/guards/rate-limit.guard';
import {
  CreateContactMessageDto,
  CreateUpgradeRequestDto,
} from './dto/inbox.dto';
import { InboxService } from './inbox.service';

/** Public forms: no account needed, a few submissions per visitor per hour. */
@Controller()
@UseGuards(FormRateLimitGuard)
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Post('contact-messages')
  @HttpCode(201)
  contact(@Body() dto: CreateContactMessageDto) {
    return this.inbox.contact(dto);
  }

  @Post('upgrade-requests')
  @HttpCode(201)
  requestUpgrade(@Body() dto: CreateUpgradeRequestDto) {
    return this.inbox.requestUpgrade(dto);
  }
}
