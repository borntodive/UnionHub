import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeniorityBracketsToContracts1774900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ADD COLUMN IF NOT EXISTS "seniorityBrackets" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" DROP COLUMN IF EXISTS "seniorityBrackets"`,
    );
  }
}
