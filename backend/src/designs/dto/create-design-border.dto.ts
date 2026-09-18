import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreateDesignBorderDto {
  @IsInt()
  @Min(0)
  order: number;

  @IsNumber()
  @Min(0.1)
  widthIn: number;

  @IsString()
  colorId: string;

  @IsString()
  patternId: string;
}
