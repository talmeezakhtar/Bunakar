import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TileDesignsService } from './tile-designs.service';
import type { TileDesign } from './entities/tile-design.entity';
import type { CreateTileDesignDto } from './dto/create-tile-design.dto';
import type { SwatchesService } from '../swatches/swatches.service';
import type { DesignQuotaService } from '../common/designs/design-quota.service';

/** Saving is always allowed here; the plan limit has its own spec. */
const quota = {
  assertCanCreate: () => Promise.resolve(),
} as unknown as DesignQuotaService;

// @nestjs/typeorm ships ESM only; InjectRepository is just DI here, the repo is passed by hand.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

const swatches = {
  toCode: (id: string) => (id === 'uuid-wine' ? 'solid-wine' : id),
} as SwatchesService;

describe('TileDesignsService.findPublic', () => {
  const design = { id: 'd1', name: 'Rug', userId: 'owner-1' } as TileDesign;
  const repo = {
    findOne: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === 'd1' ? design : null),
    ),
  } as unknown as Repository<TileDesign>;
  const service = new TileDesignsService(repo, swatches, quota);

  it('returns any design by id without its owner', async () => {
    const result = await service.findPublic('d1');
    expect(result.name).toBe('Rug');
    expect(result.userId).toBeUndefined();
  });

  it('404s for an unknown id', async () => {
    await expect(service.findPublic('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('TileDesignsService writes and summaries', () => {
  const save = jest.fn((d: TileDesign) => Promise.resolve(d));
  const find = jest.fn(() =>
    Promise.resolve([
      {
        id: 'd1',
        name: 'Rug',
        widthTiles: 4,
        heightTiles: 6,
        thumbnail: null,
        updatedAt: new Date(0),
      },
    ]),
  );
  const repo = {
    create: (d: object) => d,
    save,
    find,
  } as unknown as Repository<TileDesign>;
  const service = new TileDesignsService(repo, swatches, quota);

  it('stores legacy swatch uuids as codes and leaves codes alone', async () => {
    const saved = await service.create('owner-1', {
      name: 'Rug',
      tiles: [
        { row: 0, col: 0, swatchId: 'uuid-wine' },
        { row: 0, col: 1, swatchId: 'wool-sage' },
      ],
      myStyles: ['uuid-wine', 'wool-sage'],
    } as CreateTileDesignDto);
    expect(saved.tiles.map((t) => t.swatchId)).toEqual([
      'solid-wine',
      'wool-sage',
    ]);
    expect(saved.myStyles).toEqual(['solid-wine', 'wool-sage']);
    expect(saved.userId).toBe('owner-1');
  });

  it('summarises in feet without the tile data', async () => {
    const [summary] = await service.findSummaries('owner-1');
    expect(summary).toEqual({
      id: 'd1',
      name: 'Rug',
      kind: 'tile',
      widthFt: 6,
      heightFt: 9,
      thumbnail: null,
      updatedAt: new Date(0),
    });
    const [[options]] = find.mock.calls as unknown as [
      [{ select: object; where: object }],
    ];
    expect(options.where).toEqual({ userId: 'owner-1' });
    expect(options.select).not.toHaveProperty('tiles');
  });
});
