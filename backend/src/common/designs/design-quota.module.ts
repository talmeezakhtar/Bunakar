import { Global, Module } from '@nestjs/common';
import { DesignQuotaService } from './design-quota.service';

/** Plan limits for saving designs, shared by every design kind. */
@Global()
@Module({
  providers: [DesignQuotaService],
  exports: [DesignQuotaService],
})
export class DesignQuotaModule {}
