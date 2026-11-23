import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateContactMessageDto,
  CreateUpgradeRequestDto,
} from './dto/inbox.dto';
import { ContactMessage } from './entities/contact-message.entity';
import { UpgradeRequest } from './entities/upgrade-request.entity';

/** Stores what visitors send from the contact page and the Pro waitlist. */
@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly messages: Repository<ContactMessage>,
    @InjectRepository(UpgradeRequest)
    private readonly upgrades: Repository<UpgradeRequest>,
  ) {}

  async contact(dto: CreateContactMessageDto) {
    const saved = await this.messages.save(this.messages.create(dto));
    return { id: saved.id };
  }

  async requestUpgrade(dto: CreateUpgradeRequestDto) {
    const saved = await this.upgrades.save(
      this.upgrades.create({ ...dto, note: dto.note || null }),
    );
    return { id: saved.id };
  }
}
