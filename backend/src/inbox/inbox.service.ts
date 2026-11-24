import { randomUUID } from 'node:crypto';
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

  async contact({ website, ...dto }: CreateContactMessageDto) {
    // A filled honeypot: answer as if saved, store nothing.
    if (website) return { id: randomUUID() };
    const saved = await this.messages.save(this.messages.create(dto));
    return { id: saved.id };
  }

  async requestUpgrade({ website, ...dto }: CreateUpgradeRequestDto) {
    if (website) return { id: randomUUID() };
    const saved = await this.upgrades.save(
      this.upgrades.create({ ...dto, note: dto.note || null }),
    );
    return { id: saved.id };
  }
}
