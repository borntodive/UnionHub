import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsUSOToUsers1774920000000 implements MigrationInterface {
  name = "AddIsUSOToUsers1774920000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isUSO" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isUSO"`);
  }
}
