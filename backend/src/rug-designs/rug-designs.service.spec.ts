import type { Repository } from 'typeorm';
import type { DesignQuotaService } from '../common/designs/design-quota.service';
import type { SwatchesService } from '../swatches/swatches.service';
import { RugDesignsService } from './rug-designs.service';
import type { RugDesign } from './entities/rug-design.entity';
import type { CreateRugDesignDto } from './dto/rug-design.dto';

// The service's own logic is under test; @nestjs/typeorm ships as ESM, so its decorator is stubbed.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

const assertCanCreate = jest.fn(() => Promise.resolve());
const quota = { assertCanCreate } as unknown as DesignQuotaService;
// Legacy uuid -> code, like the swatch catalogue does.
const swatches = {
  toCode: (id: string) => (id === 'uuid-wine' ? 'solid-wine' : id),
} as SwatchesService;

describe('RugDesignsService', () => {
  const save = jest.fn((d: RugDesign) => Promise.resolve(d));
  const repo = {
    create: (d: object) => d,
    save,
  } as unknown as Repository<RugDesign>;
  const service = new RugDesignsService(repo, swatches, quota);

  it('checks the plan quota and stores legacy swatch ids as codes in every layer', async () => {
    const dto: CreateRugDesignDto = {
      name: 'Studio rug',
      construction: 'knotted',
      widthFt: 6,
      heightFt: 9,
      doc: {
        palette: [{ swatchId: 'uuid-wine', fibre: 'wool' }],
        layers: [
          { kind: 'chart', cells: 'abc' },
          {
            kind: 'tiles',
            tiles: { '0-0': [{ swatchId: 'uuid-wine', cutType: 'full' }] },
          },
          {
            kind: 'shapes',
            ground: { swatchId: 'uuid-wine' },
            shapes: [{ swatchId: 'uuid-wine' }],
          },
        ],
      },
    };
    const saved = (await service.create('owner-1', dto)) as unknown as {
      userId: string;
      doc: {
        palette: { swatchId: string }[];
        layers: Record<string, unknown>[];
      };
    };
    expect(assertCanCreate).toHaveBeenCalledWith('owner-1');
    expect(saved.userId).toBe('owner-1');
    expect(saved.doc.palette[0].swatchId).toBe('solid-wine');
    expect(saved.doc.layers[0]).toEqual({ kind: 'chart', cells: 'abc' });
    expect(JSON.stringify(saved.doc.layers.slice(1))).not.toContain(
      'uuid-wine',
    );
  });
});
