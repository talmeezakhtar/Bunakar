import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsThumbnail } from '../../common/designs/thumbnail.decorator';
import { CONSTRUCTIONS } from '../entities/rug-design.entity';
import type { Construction } from '../entities/rug-design.entity';

/** The longest side a rug may be, in feet (the tile designer's 200 tiles). */
const MAX_FT = 300;

export class CreateRugDesignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsIn(CONSTRUCTIONS)
  construction: Construction;

  @IsNumber()
  @Min(0.5)
  @Max(MAX_FT)
  widthFt: number;

  @IsNumber()
  @Min(0.5)
  @Max(MAX_FT)
  heightFt: number;

  /** The rug document; its size is capped by the route's body limit. */
  @IsObject()
  doc: Record<string, unknown>;

  @IsThumbnail()
  thumbnail?: string | null;
}

export class UpdateRugDesignDto extends CreateRugDesignDto {}
