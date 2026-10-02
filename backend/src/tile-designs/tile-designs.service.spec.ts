import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { TileDesignsService } from './tile-designs.service';
import type { TileDesign } from './entities/tile-design.entity';

// @nestjs/typeorm ships ESM only; InjectRepository is just DI here, the repo is passed by hand.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('TileDesignsService.findPublic', () => {
  const design = { id: 'd1', name: 'Rug', userId: 'owner-1' } as TileDesign;
  const repo = {
    findOne: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(where.id === 'd1' ? design : null),
    ),
  } as unknown as Repository<TileDesign>;
  const service = new TileDesignsService(repo);

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
