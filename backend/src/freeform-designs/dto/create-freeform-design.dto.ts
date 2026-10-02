import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TileRugCategory } from '../../tile-designs/entities/tile-design.entity';
import type {
  Carving,
  PileHeight,
  PileTexture,
} from '../entities/freeform-design.entity';

const TEXTURES = ['cut', 'loop', 'shag', 'highlow', 'photo'];
const CARVINGS = ['none', 'groove', 'ribbed', 'contour'];
const PILES = ['low', 'standard', 'high'];

export class PointDto {
  @IsNumber()
  @Min(-10)
  @Max(210)
  x: number;

  @IsNumber()
  @Min(-10)
  @Max(210)
  y: number;
}

export class SurfaceFinishDto {
  @IsString()
  @MaxLength(64)
  swatchId: string;

  @IsIn(TEXTURES)
  texture: PileTexture;

  @IsIn(CARVINGS)
  carve: Carving;

  @IsNumber()
  @Min(-360)
  @Max(360)
  carveAngle: number;

  @IsIn(PILES)
  pile: PileHeight;
}

export class FreeformShapeDto extends SurfaceFinishDto {
  @IsString()
  @MaxLength(64)
  id: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points: PointDto[];

  @IsBoolean()
  smooth: boolean;
}

export class CreateFreeformDesignDto {
  // Sizes match the designer's FREEFORM_SIZE_LIMITS (2-30 ft) - the API mustn't accept more.
  @IsString()
  @MaxLength(120)
  name: string;

  @IsNumber()
  @Min(2)
  @Max(30)
  widthFt: number;

  @IsNumber()
  @Min(2)
  @Max(30)
  heightFt: number;

  @IsOptional()
  @IsEnum(TileRugCategory)
  rugCategory?: TileRugCategory;

  @IsString()
  @MaxLength(64)
  backgroundId: string;

  @ValidateNested()
  @Type(() => SurfaceFinishDto)
  ground: SurfaceFinishDto;

  @IsArray()
  @ArrayMaxSize(1_000)
  @ValidateNested({ each: true })
  @Type(() => FreeformShapeDto)
  shapes: FreeformShapeDto[];

  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  myStyles: string[];
}

export class UpdateFreeformDesignDto extends CreateFreeformDesignDto {}
