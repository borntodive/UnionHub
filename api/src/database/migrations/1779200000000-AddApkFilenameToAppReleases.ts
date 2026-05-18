import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApkFilenameToAppReleases1779200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_releases" ADD "apkFilename" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_releases" DROP COLUMN IF EXISTS "apkFilename"`,
    );
  }
}
