import { MigrationInterface, QueryRunner } from 'typeorm';

/** Share links become opt-in per design (existing designs stay shared, so links already sent
 * keep working), and accounts get a token version so signing out ends every session. */
export class SharingAndSessions1795400000000 implements MigrationInterface {
  name = 'SharingAndSessions1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['rug_designs', 'tile_designs', 'freeform_designs']) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "shared" boolean NOT NULL DEFAULT false`,
      );
      await queryRunner.query(`UPDATE "${table}" SET "shared" = true`);
    }
    await queryRunner.query(
      `ALTER TABLE "users" ADD "tokenVersion" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tokenVersion"`);
    for (const table of ['freeform_designs', 'tile_designs', 'rug_designs']) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "shared"`);
    }
  }
}
