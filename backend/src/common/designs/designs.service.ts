import { NotFoundException } from '@nestjs/common';
import type {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsSelect,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import type { SwatchesService } from '../../swatches/swatches.service';
import type { DesignQuotaService } from './design-quota.service';
import type { SwatchIdMap } from './swatch-ids';

/** Columns every design table shares. */
export interface DesignRow {
  id: string;
  userId: string;
  name: string;
  thumbnail: string | null;
  shared: boolean;
  updatedAt: Date;
}

export type DesignKind = 'tile' | 'freeform' | 'studio';

/** What design lists show: no tile or shape data, so a list stays small. */
export interface DesignSummary {
  id: string;
  name: string;
  kind: DesignKind;
  widthFt: number;
  heightFt: number;
  thumbnail: string | null;
  updatedAt: Date;
}

/** CRUD for one kind of design. Designs are private to their owner, except the read-only
 * public view behind share links. */
export abstract class DesignsService<T extends DesignRow, Dto extends object> {
  protected abstract readonly kind: DesignKind;
  /** Columns (beyond the shared ones) that `size` reads. */
  protected abstract readonly sizeColumns: (keyof T)[];
  protected abstract size(row: T): { widthFt: number; heightFt: number };
  /** Applies `map` to every swatch id inside the design body. */
  protected abstract mapSwatchIds(dto: Dto, map: SwatchIdMap): Dto;

  constructor(
    protected readonly repo: Repository<T>,
    private readonly swatches: SwatchesService,
    private readonly quota: DesignQuotaService,
  ) {}

  /** Clients may send legacy swatch uuids; they are stored as codes. */
  private canonical(dto: Dto) {
    return this.mapSwatchIds(dto, this.swatches.toCode);
  }

  private mine(userId: string) {
    return { userId } as FindOptionsWhere<T>;
  }

  private newestFirst() {
    return { updatedAt: 'DESC' } as FindOptionsOrder<T>;
  }

  async create(userId: string, dto: Dto) {
    await this.quota.assertCanCreate(userId);
    return this.repo.save(
      this.repo.create({
        ...this.canonical(dto),
        userId,
      } as unknown as DeepPartial<T>),
    );
  }

  findAllForUser(userId: string) {
    return this.repo.find({
      where: this.mine(userId),
      order: this.newestFirst(),
    });
  }

  async findSummaries(userId: string): Promise<DesignSummary[]> {
    const columns = [
      'id',
      'name',
      'thumbnail',
      'updatedAt',
      ...this.sizeColumns,
    ];
    const rows = await this.repo.find({
      select: Object.fromEntries(
        columns.map((c) => [c, true]),
      ) as FindOptionsSelect<T>,
      where: this.mine(userId),
      order: this.newestFirst(),
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      kind: this.kind,
      ...this.size(row),
      thumbnail: row.thumbnail ?? null,
      updatedAt: row.updatedAt,
    }));
  }

  /** Another user's design is reported as missing, so ids don't reveal what exists. */
  async findOne(id: string, userId: string) {
    const design = await this.repo.findOne({
      where: { id, userId } as FindOptionsWhere<T>,
    });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return design;
  }

  /** Read-only view for shared preview links: anyone with the (unguessable) id of a design its
   * owner has shared may look, without learning who owns it. Editing still goes through the
   * owner-only routes. */
  async findPublic(id: string) {
    const design = await this.repo.findOne({
      where: { id, shared: true } as FindOptionsWhere<T>,
    });
    if (!design) throw new NotFoundException(`Design ${id} not found`);
    return { ...design, userId: undefined } as Omit<T, 'userId'> & {
      userId?: undefined;
    };
  }

  async update(id: string, userId: string, dto: Dto) {
    const design = await this.findOne(id, userId);
    Object.assign(design, this.canonical(dto));
    return this.repo.save(design);
  }

  /** Turns the design's share link on or off. */
  async setShared(id: string, userId: string, shared: boolean) {
    const design = await this.findOne(id, userId);
    design.shared = shared;
    await this.repo.save(design);
    return { shared };
  }

  async remove(id: string, userId: string) {
    await this.repo.remove(await this.findOne(id, userId));
  }
}
