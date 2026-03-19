import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDateOfEntryAndCaptaincy1773700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "dateOfEntry" date,
            ADD COLUMN "dateOfCaptaincy" date
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "dateOfEntry",
            DROP COLUMN "dateOfCaptaincy"
        `);
  }
}
