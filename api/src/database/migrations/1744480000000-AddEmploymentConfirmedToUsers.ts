import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmploymentConfirmedToUsers1744480000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "employmentConfirmed" boolean DEFAULT false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "employmentConfirmed"
        `);
  }
}
