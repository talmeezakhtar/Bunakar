import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { FreeformDesignsService } from './freeform-designs.service';
import type { FreeformDesign } from './entities/freeform-design.entity';
import type { CreateFreeformDesignDto } from './dto/create-freeform-design.dto';
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

describe('FreeformDesignsService ownership', () => {
  const design = {
    id: 'd1',
    name: 'Sage Garden',
    userId: 'owner-1',
  } as FreeformDesign;
  /** Matches every field in `where`, like the real repository. */
  const matches = (where: Partial<FreeformDesign>) =>
    Object.entries(where).every(
      ([k, v]) => design[k as keyof FreeformDesign] === v,
    );
  const repo = {
    findOne: jest.fn(({ where }: { where: Partial<FreeformDesign> }) =>
      Promise.resolve(matches(where) ? { ...design } : null),
    ),
    save: jest.fn((d: FreeformDesign) => Promise.resolve(d)),
    remove: jest.fn(() => Promise.resolve()),
  };
  const swatches = { toCode: (id: string) => id } as SwatchesService;
  const service = new FreeformDesignsService(
    repo as unknown as Repository<FreeformDesign>,
    swatches,
    quota,
  );
  const body = {
    name: 'Renamed',
    ground: { swatchId: 'wool-sage' },
    shapes: [],
    myStyles: [],
  } as unknown as CreateFreeformDesignDto;

  beforeEach(() => jest.clearAllMocks());

  it('lets the owner read, update and delete', async () => {
    await expect(service.findOne('d1', 'owner-1')).resolves.toMatchObject({
      id: 'd1',
    });
    await expect(service.update('d1', 'owner-1', body)).resolves.toMatchObject({
      name: 'Renamed',
    });
    await service.remove('d1', 'owner-1');
    expect(repo.remove).toHaveBeenCalledTimes(1);
  });

  it("404s on someone else's design for read, update and delete", async () => {
    await expect(service.findOne('d1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update('d1', 'intruder', body)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove('d1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('shows the public view to anyone, without the owner', async () => {
    const result = await service.findPublic('d1');
    expect(result.name).toBe('Sage Garden');
    expect(result.userId).toBeUndefined();
  });
});
