import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserLanguage1774000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "language" character varying(10) DEFAULT 'it'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "language"
        `);
  }
}
