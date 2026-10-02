import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  // bcrypt only reads the first 72 bytes, so longer input can't be a real password here.
  @IsString()
  @MaxLength(72)
  password: string;
}
