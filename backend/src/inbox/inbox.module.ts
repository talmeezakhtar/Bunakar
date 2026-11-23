import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { UpgradeRequest } from './entities/upgrade-request.entity';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessage, UpgradeRequest])],
  controllers: [InboxController],
  providers: [InboxService],
})
export class InboxModule {}
