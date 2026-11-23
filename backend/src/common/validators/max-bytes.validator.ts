import { ValidationOptions, registerDecorator } from 'class-validator';

/** Caps a string's UTF-8 length in bytes (MaxLength counts UTF-16 units). bcrypt reads only
 * the first 72 bytes, and one accented letter or emoji can take 2-4 of them. */
export function MaxBytes(max: number, options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'maxBytes',
      target: target.constructor,
      propertyName,
      constraints: [max],
      options: {
        message: `${propertyName} must be at most ${max} bytes`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
      },
    });
}
