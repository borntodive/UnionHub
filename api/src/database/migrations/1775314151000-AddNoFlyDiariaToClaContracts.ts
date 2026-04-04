import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNoFlyDiariaToClaContracts1775314151000 implements MigrationInterface {
  name = "AddNoFlyDiariaToClaContracts1775314151000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ADD COLUMN "noFlyDiaria" numeric(10,4) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" DROP COLUMN "noFlyDiaria"`,
    );
  }
}
