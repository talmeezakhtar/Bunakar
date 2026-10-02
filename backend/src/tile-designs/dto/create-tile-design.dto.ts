import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  TileCutType,
  TileDesignOrientation,
  TileRugCategory,
} from '../entities/tile-design.entity';

export class TileSlotDto {
  @IsInt()
  @Min(0)
  x: number;

  @IsInt()
  @Min(0)
  y: number;
}

export class TileCellDto {
  @IsInt()
  @Min(0)
  row: number;

  @IsInt()
  @Min(0)
  col: number;

  @IsString()
  @MaxLength(64)
  swatchId: string;

  @IsEnum(TileCutType)
  cutType: TileCutType;

  @IsIn([0, 90, 180, 270])
  rotation: 0 | 90 | 180 | 270;

  @IsOptional()
  @ValidateNested()
  @Type(() => TileSlotDto)
  slot?: TileSlotDto;
}

export class TileOverlayDto {
  @IsString()
  @MaxLength(64)
  id: string;

  @IsString()
  @MaxLength(64)
  assetId: string;

  @IsInt()
  @Min(0)
  row: number;

  @IsInt()
  @Min(0)
  col: number;

  @IsInt()
  @Min(1)
  @Max(200)
  widthTiles: number;

  @IsInt()
  @Min(1)
  @Max(200)
  heightTiles: number;

  @IsIn([0, 90, 180, 270])
  rotation: 0 | 90 | 180 | 270;

  @IsOptional()
  @IsIn([0.5, 1])
  thickness?: 0.5 | 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  reach?: number;
}

export class CreateTileDesignDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsInt()
  @Min(1)
  @Max(200)
  widthTiles: number;

  @IsInt()
  @Min(1)
  @Max(200)
  heightTiles: number;

  @IsEnum(TileDesignOrientation)
  orientation: TileDesignOrientation;

  @IsOptional()
  @IsEnum(TileRugCategory)
  rugCategory?: TileRugCategory;

  @IsString()
  @MaxLength(64)
  backgroundId: string;

  // Several pieces per cell for subdividing cuts; must fit the JSON body limit in main.ts.
  @IsArray()
  @ArrayMaxSize(50_000)
  @ValidateNested({ each: true })
  @Type(() => TileCellDto)
  tiles: TileCellDto[];

  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  myStyles: string[];

  // Optional so clients from before design pieces keep saving.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2_000)
  @ValidateNested({ each: true })
  @Type(() => TileOverlayDto)
  overlays?: TileOverlayDto[];
}
