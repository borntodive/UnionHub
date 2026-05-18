import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppReleasesTable1779100000000 implements MigrationInterface {
  name = "AddAppReleasesTable1779100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_releases" (
        "id"           uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "version"      character varying NOT NULL,
        "minVersion"   character varying,
        "platform"     character varying NOT NULL DEFAULT 'all',
        "releaseNotes" text,
        "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_releases" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_releases"`);
  }
}
