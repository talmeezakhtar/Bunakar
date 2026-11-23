import { MigrationInterface, QueryRunner } from 'typeorm';

/** Free/Pro plans on accounts, and the contact page and Pro waitlist inboxes. */
export class PlansAndInbox1795340000000 implements MigrationInterface {
  name = 'PlansAndInbox1795340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_plan_enum" AS ENUM('free', 'pro')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "plan" "public"."users_plan_enum" NOT NULL DEFAULT 'free'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "planSince" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TABLE "contact_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "topic" character varying NOT NULL, "message" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_contact_messages_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "upgrade_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "use" character varying NOT NULL, "billing" character varying NOT NULL, "note" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_upgrade_requests_id" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "upgrade_requests"`);
    await queryRunner.query(`DROP TABLE "contact_messages"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "planSince"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "plan"`);
    await queryRunner.query(`DROP TYPE "public"."users_plan_enum"`);
  }
}
