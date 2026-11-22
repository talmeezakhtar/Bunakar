import { MigrationInterface, QueryRunner } from 'typeorm';

/** The schema as schema sync left it, before migrations took over. */
export class Baseline1795263885686 implements MigrationInterface {
  name = 'Baseline1795263885686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Databases created before migrations existed were built by schema sync from these same
    // entities. They already hold this schema, so the baseline only gets recorded as run.
    const [{ exists }] = (await queryRunner.query(
      `SELECT to_regclass('public.users') IS NOT NULL AS "exists"`,
    )) as { exists: boolean }[];
    if (exists) return;
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('seller', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'seller', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tile_designs_orientation_enum" AS ENUM('normal', 'diagonal')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tile_designs_rugcategory_enum" AS ENUM('area', 'runner', 'wall')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tile_designs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "widthTiles" integer NOT NULL, "heightTiles" integer NOT NULL, "orientation" "public"."tile_designs_orientation_enum" NOT NULL DEFAULT 'normal', "rugCategory" "public"."tile_designs_rugcategory_enum" NOT NULL DEFAULT 'area', "backgroundId" character varying NOT NULL, "tiles" jsonb NOT NULL DEFAULT '[]', "myStyles" jsonb NOT NULL DEFAULT '[]', "overlays" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4073b4382382f0a6895df37b07c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_735050534796a0a2700318af30" ON "tile_designs"  ("userId", "updatedAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."freeform_designs_rugcategory_enum" AS ENUM('area', 'runner', 'wall')`,
    );
    await queryRunner.query(
      `CREATE TABLE "freeform_designs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying NOT NULL, "widthFt" double precision NOT NULL, "heightFt" double precision NOT NULL, "rugCategory" "public"."freeform_designs_rugcategory_enum" NOT NULL DEFAULT 'area', "backgroundId" character varying NOT NULL, "ground" jsonb NOT NULL, "shapes" jsonb NOT NULL DEFAULT '[]', "myStyles" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_96b2439971da7c1b93900765333" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_23f108d8d59223394c6d63a14f" ON "freeform_designs"  ("userId", "updatedAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "swatches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "familyId" character varying NOT NULL, "familyName" character varying NOT NULL, "colorName" character varying NOT NULL, "swatchColor" character varying NOT NULL, "imageUrl" character varying, "categories" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_2514a2fb6ac21565f4161de7a04" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "tile_designs" ADD CONSTRAINT "FK_dcc4b53eb19a30790e60d1d37ac" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "freeform_designs" ADD CONSTRAINT "FK_607e0314f05f85580f832a6f727" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "freeform_designs" DROP CONSTRAINT "FK_607e0314f05f85580f832a6f727"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tile_designs" DROP CONSTRAINT "FK_dcc4b53eb19a30790e60d1d37ac"`,
    );
    await queryRunner.query(`DROP TABLE "swatches"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_23f108d8d59223394c6d63a14f"`,
    );
    await queryRunner.query(`DROP TABLE "freeform_designs"`);
    await queryRunner.query(
      `DROP TYPE "public"."freeform_designs_rugcategory_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_735050534796a0a2700318af30"`,
    );
    await queryRunner.query(`DROP TABLE "tile_designs"`);
    await queryRunner.query(
      `DROP TYPE "public"."tile_designs_rugcategory_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tile_designs_orientation_enum"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
