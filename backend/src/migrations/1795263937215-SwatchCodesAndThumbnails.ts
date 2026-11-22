import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  mapFreeformSwatchIds,
  mapTileSwatchIds,
  SwatchIdMap,
} from '../common/designs/swatch-ids';

// Frozen copy of the seed's [familyId, colorName, code] at the time of this migration - the
// codes match frontend/src/data/mockSwatches.ts. Later seed edits must not change history.
const CODES: [string, string, string][] = [
  ['solid', 'Wine', 'solid-wine'],
  ['solid', 'Gold', 'solid-gold'],
  ['solid', 'Ivory', 'solid-ivory'],
  ['solid', 'Navy', 'solid-navy'],
  ['solid', 'Forest', 'solid-forest'],
  ['geometric-bloom', 'Emerald', 'geo-emerald'],
  ['geometric-bloom', 'Clay', 'geo-clay'],
  ['geometric-bloom', 'Slate', 'geo-slate'],
  ['persian-medallion', 'Wine & Gold', 'persian-wine'],
  ['persian-medallion', 'Navy & Ivory', 'persian-navy'],
  ['tribal-weave', 'Clay & Gold', 'tribal-clay'],
  ['tribal-weave', 'Charcoal', 'tribal-charcoal'],
  ['strata', 'Graphite Taupe', 'strata-graphite-taupe'],
  ['strata', 'Silver', 'strata-silver'],
  ['strata', 'Pewter', 'strata-pewter'],
  ['strata', 'Ash', 'strata-ash'],
  ['strata', 'Slate', 'strata-slate'],
  ['strata', 'Midnight', 'strata-midnight'],
  ['heather-loop', 'Cadet Blue', 'heather-loop-cadet-blue'],
  ['heather-loop', 'Stone', 'heather-loop-stone'],
  ['heather-loop', 'Chalk', 'heather-loop-chalk'],
  ['heather-loop', 'Juniper', 'heather-loop-juniper'],
  ['drift', 'Umber', 'drift-umber'],
  ['drift', 'Sandstone', 'drift-sandstone'],
  ['drift', 'Smoke', 'drift-smoke'],
  ['basketweave', 'Onyx', 'basketweave-onyx'],
  ['crescent', 'Denim', 'crescent-denim'],
  ['lattice', 'Harbor', 'lattice-harbor'],
  ['tweed', 'Charcoal Check', 'tweed-charcoal-check'],
  ['tufted-wool', 'Ivory', 'wool-ivory'],
  ['tufted-wool', 'Oat', 'wool-oat'],
  ['tufted-wool', 'Sand', 'wool-sand'],
  ['tufted-wool', 'Camel', 'wool-camel'],
  ['tufted-wool', 'Blush', 'wool-blush'],
  ['tufted-wool', 'Coral', 'wool-coral'],
  ['tufted-wool', 'Terracotta', 'wool-terracotta'],
  ['tufted-wool', 'Mustard', 'wool-mustard'],
  ['tufted-wool', 'Aqua', 'wool-aqua'],
  ['tufted-wool', 'Petrol', 'wool-petrol'],
  ['tufted-wool', 'Sage', 'wool-sage'],
  ['tufted-wool', 'Stone', 'wool-stone'],
  ['tufted-wool', 'Graphite', 'wool-graphite'],
  ['tufted-wool', 'Charcoal', 'wool-charcoal'],
];

interface SwatchRow {
  id: string;
  familyId: string;
  colorName: string;
}

/** Gives swatches a stable slug `code` (the id clients see) and rewrites the swatch uuids stored
 * inside saved designs to those codes, so designs no longer depend on the catalog's uuids.
 * Also adds the list thumbnail column. */
export class SwatchCodesAndThumbnails1795263937215 implements MigrationInterface {
  name = 'SwatchCodesAndThumbnails1795263937215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tile_designs" ADD "thumbnail" text`);
    await queryRunner.query(
      `ALTER TABLE "freeform_designs" ADD "thumbnail" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "swatches" ADD "code" character varying`,
    );

    // Every uuid maps to its style's code. If a style was seeded twice, the first row takes the
    // code and the others a `legacy-<uuid>` one, while designs using either uuid get the code.
    const byStyle = new Map(CODES.map(([f, c, code]) => [`${f}/${c}`, code]));
    const rows = (await queryRunner.query(
      `SELECT "id", "familyId", "colorName" FROM "swatches" ORDER BY "id"`,
    )) as SwatchRow[];
    const toCode = new Map<string, string>();
    const taken = new Set<string>();
    for (const row of rows) {
      const code = byStyle.get(`${row.familyId}/${row.colorName}`);
      const own = code && !taken.has(code) ? code : `legacy-${row.id}`;
      taken.add(own);
      toCode.set(row.id, code ?? own);
      await queryRunner.query(
        `UPDATE "swatches" SET "code" = $1 WHERE "id" = $2`,
        [own, row.id],
      );
    }
    await queryRunner.query(
      `ALTER TABLE "swatches" ALTER COLUMN "code" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "swatches" ADD CONSTRAINT "UQ_be2b2e3b4b3893453438a596a06" UNIQUE ("code")`,
    );

    await rewriteDesigns(queryRunner, (id) => toCode.get(id) ?? id);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Back to uuids: each code maps to the row that owns it.
    const rows = (await queryRunner.query(
      `SELECT "id", "code" FROM "swatches"`,
    )) as { id: string; code: string }[];
    const toId = new Map(rows.map((r) => [r.code, r.id]));
    await rewriteDesigns(queryRunner, (code) => toId.get(code) ?? code);

    await queryRunner.query(
      `ALTER TABLE "swatches" DROP CONSTRAINT "UQ_be2b2e3b4b3893453438a596a06"`,
    );
    await queryRunner.query(`ALTER TABLE "swatches" DROP COLUMN "code"`);
    await queryRunner.query(
      `ALTER TABLE "freeform_designs" DROP COLUMN "thumbnail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tile_designs" DROP COLUMN "thumbnail"`,
    );
  }
}

/** One design at a time: a large rug holds tens of thousands of tiles. */
async function rewriteDesigns(queryRunner: QueryRunner, map: SwatchIdMap) {
  const tileIds = (await queryRunner.query(
    `SELECT "id" FROM "tile_designs"`,
  )) as { id: string }[];
  for (const { id } of tileIds) {
    const [row] = (await queryRunner.query(
      `SELECT "tiles", "myStyles" FROM "tile_designs" WHERE "id" = $1`,
      [id],
    )) as { tiles: { swatchId: string }[]; myStyles: string[] }[];
    // A row in an unexpected shape keeps its data as is rather than stopping the deploy.
    if (!Array.isArray(row.tiles) || !Array.isArray(row.myStyles)) continue;
    const next = mapTileSwatchIds(row, map);
    await queryRunner.query(
      `UPDATE "tile_designs" SET "tiles" = $1, "myStyles" = $2 WHERE "id" = $3`,
      [JSON.stringify(next.tiles), JSON.stringify(next.myStyles), id],
    );
  }

  const freeformIds = (await queryRunner.query(
    `SELECT "id" FROM "freeform_designs"`,
  )) as { id: string }[];
  for (const { id } of freeformIds) {
    const [row] = (await queryRunner.query(
      `SELECT "ground", "shapes", "myStyles" FROM "freeform_designs" WHERE "id" = $1`,
      [id],
    )) as {
      ground: { swatchId: string };
      shapes: { swatchId: string }[];
      myStyles: string[];
    }[];
    if (
      !row.ground ||
      !Array.isArray(row.shapes) ||
      !Array.isArray(row.myStyles)
    )
      continue;
    const next = mapFreeformSwatchIds(row, map);
    await queryRunner.query(
      `UPDATE "freeform_designs" SET "ground" = $1, "shapes" = $2, "myStyles" = $3 WHERE "id" = $4`,
      [
        JSON.stringify(next.ground),
        JSON.stringify(next.shapes),
        JSON.stringify(next.myStyles),
        id,
      ],
    );
  }
}
