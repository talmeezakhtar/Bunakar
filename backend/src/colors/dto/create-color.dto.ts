import { IsEnum, IsHexColor, IsString } from 'class-validator';
import { ColorGroup } from '../entities/color.entity';

export class CreateColorDto {
  @IsString()
  name: string;

  @IsHexColor()
  hex: string;

  @IsEnum(ColorGroup)
  group: ColorGroup;
}
