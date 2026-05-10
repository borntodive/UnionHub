import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHandlingFrequencyToVolmets1778500000000 implements MigrationInterface {
  name = "AddHandlingFrequencyToVolmets1778500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volmets" ADD COLUMN "handlingFrequency" character varying(30)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volmets" DROP COLUMN "handlingFrequency"`,
    );
  }
}
