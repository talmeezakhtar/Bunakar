import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const CONTACT_TOPICS = [
  'general',
  'support',
  'business',
  'press',
] as const;

/** The hidden honeypot field: people leave it empty, form-filling bots don't. */
class HoneypotFields {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}

export class CreateContactMessageDto extends HoneypotFields {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @Transform(lower)
  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsIn(CONTACT_TOPICS)
  topic: (typeof CONTACT_TOPICS)[number];

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;
}

export class CreateUpgradeRequestDto extends HoneypotFields {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @Transform(lower)
  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsIn(['home', 'business'])
  use: 'home' | 'business';

  @IsIn(['monthly', 'yearly'])
  billing: 'monthly' | 'yearly';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
