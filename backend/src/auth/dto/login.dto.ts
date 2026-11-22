import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';
import { MaxBytes } from '../../common/validators/max-bytes.validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  // bcrypt only reads the first 72 bytes (not characters), so longer input can't be a real password.
  @IsString()
  @MaxBytes(72)
  password: string;
}
