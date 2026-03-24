import { MigrationInterface, QueryRunner } from "typeorm";

export class DropDeactivatedAt1774700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "deactivatedAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }
}
