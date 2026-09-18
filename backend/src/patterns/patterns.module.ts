import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatternsController } from './patterns.controller';
import { PatternsService } from './patterns.service';
import { Pattern } from './entities/pattern.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pattern])],
  controllers: [PatternsController],
  providers: [PatternsService],
  exports: [PatternsService],
})
export class PatternsModule {}
