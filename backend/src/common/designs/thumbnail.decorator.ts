import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Longest thumbnail accepted: a small webp data URL is well under this. */
export const THUMBNAIL_MAX_LENGTH = 60_000;

/** Optional list thumbnail, a `data:image/webp;base64,...` URL. `null` clears it. */
export const IsThumbnail = () =>
  applyDecorators(
    IsOptional(),
    IsString(),
    MaxLength(THUMBNAIL_MAX_LENGTH),
    Matches(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, {
      message: 'thumbnail must be a base64 webp data URL',
    }),
  );
