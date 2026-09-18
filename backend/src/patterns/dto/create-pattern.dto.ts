import { IsArray, IsEnum, IsString } from 'class-validator';
import { PatternCategory } from '../entities/pattern.entity';

export class CreatePatternDto {
  @IsString()
  name: string;

  @IsEnum(PatternCategory)
  category: PatternCategory;

  @IsString()
  svgPath: string;

  @IsArray()
  @IsString({ each: true })
  colorSlots: string[];
}
