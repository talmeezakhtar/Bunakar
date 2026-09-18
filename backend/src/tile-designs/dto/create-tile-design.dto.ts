import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TileCutType, TileDesignOrientation, TileRugCategory } from '../entities/tile-design.entity';

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

export class CreateTileDesignDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  widthTiles: number;

  @IsInt()
  @Min(1)
  heightTiles: number;

  @IsEnum(TileDesignOrientation)
  orientation: TileDesignOrientation;

  @IsOptional()
  @IsEnum(TileRugCategory)
  rugCategory?: TileRugCategory;

  @IsString()
  backgroundId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TileCellDto)
  tiles: TileCellDto[];

  @IsArray()
  @IsString({ each: true })
  myStyles: string[];
}
