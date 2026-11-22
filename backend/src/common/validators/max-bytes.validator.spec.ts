import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from '../../auth/dto/login.dto';
import { RegisterDto } from '../../auth/dto/register.dto';

const errorsFor = (password: string) => ({
  login: validateSync(
    plainToInstance(LoginDto, { email: 'a@b.co', password }),
  ).map((e) => e.property),
  register: validateSync(
    plainToInstance(RegisterDto, { email: 'a@b.co', password, name: 'A' }),
  ).map((e) => e.property),
});

describe('MaxBytes on passwords', () => {
  it('accepts 72 bytes', () => {
    expect(errorsFor('a'.repeat(72))).toEqual({ login: [], register: [] });
  });

  it('rejects 73 ASCII bytes', () => {
    expect(errorsFor('a'.repeat(73))).toEqual({
      login: ['password'],
      register: ['password'],
    });
  });

  it('counts bytes, not characters: 24 emoji are 24 chars but 96 bytes', () => {
    const emoji = '\u{1F9F6}'.repeat(24);
    expect(emoji.length).toBeLessThanOrEqual(72);
    expect(errorsFor(emoji)).toEqual({
      login: ['password'],
      register: ['password'],
    });
  });
});
