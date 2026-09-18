import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DesignShape } from '../entities/design.entity';
import { CreateDesignBorderDto } from './create-design-border.dto';

export class CreateDesignDto {
  @IsEnum(DesignShape)
  shape: DesignShape;

  @IsNumber()
  @Min(1)
  widthFt: number;

  @IsNumber()
  @Min(1)
  heightFt: number;

  @IsString()
  fieldColorId: string;

  @IsString()
  fieldPatternId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDesignBorderDto)
  borders: CreateDesignBorderDto[];

  @IsBoolean()
  medallionEnabled: boolean;

  @IsOptional()
  @IsString()
  medallionPatternId?: string;

  @IsOptional()
  @IsString()
  medallionColorId?: string;

  @IsOptional()
  @IsNumber()
  medallionScale?: number;

  @IsString()
  materialId: string;

  @IsString()
  pileTypeId: string;
}
