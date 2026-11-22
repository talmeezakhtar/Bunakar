import { MigrationInterface, QueryRunner } from 'typeorm';

/** Bunakar Studio rugs: one JSON document per rug, with list columns beside it. */
export class RugDesigns1795350000000 implements MigrationInterface {
  name = 'RugDesigns1795350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rug_designs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "construction" character varying(20) NOT NULL, "widthFt" double precision NOT NULL, "heightFt" double precision NOT NULL, "doc" jsonb NOT NULL, "thumbnail" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_rug_designs_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rug_designs_user_updated" ON "rug_designs" ("userId", "updatedAt")`,
    );
    await queryRunner.query(
      `ALTER TABLE "rug_designs" ADD CONSTRAINT "FK_rug_designs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rug_designs"`);
  }
}
