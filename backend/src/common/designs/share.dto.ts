import { IsBoolean } from 'class-validator';

export class ShareDesignDto {
  @IsBoolean()
  shared: boolean;
}
