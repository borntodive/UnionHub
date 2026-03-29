import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRegistrationStatusToUsers1774930000000 implements MigrationInterface {
  name = "AddRegistrationStatusToUsers1774930000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registrationStatus" VARCHAR(20) NOT NULL DEFAULT 'approved'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "registrationStatus"`,
    );
  }
}
