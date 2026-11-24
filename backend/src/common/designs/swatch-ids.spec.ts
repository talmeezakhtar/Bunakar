import { BadRequestException } from '@nestjs/common';
import { mapDocSwatchIds } from './swatch-ids';

describe('mapDocSwatchIds', () => {
  const id = (s: string) => s.toUpperCase();

  it('maps palette and layer swatch ids', () => {
    const out = mapDocSwatchIds(
      {
        doc: {
          palette: [{ swatchId: 'a' }],
          layers: [{ kind: 'tiles', tiles: { t: [{ swatchId: 'b' }] } }],
        },
      },
      id,
    );
    expect(out.doc).toMatchObject({
      palette: [{ swatchId: 'A' }],
      layers: [{ tiles: { t: [{ swatchId: 'B' }] } }],
    });
  });

  it.each([
    { palette: 'x' },
    { layers: {} },
    { layers: [null] },
    { layers: [{ kind: 'tiles', tiles: { t: 'no' } }] },
  ])('answers 400 for a malformed document %#', (doc: unknown) => {
    expect(() =>
      mapDocSwatchIds({ doc: doc as Record<string, unknown> }, id),
    ).toThrow(BadRequestException);
  });
});
