import { MigrationInterface, QueryRunner } from "typeorm";

export class AddItudToContracts1773600294638 implements MigrationInterface {
  name = "AddItudToContracts1773600294638";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ADD "itud" numeric(10,2) NOT NULL DEFAULT '120'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT '51.92'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(year FROM CURRENT_DATE)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT 51.92`,
    );
    await queryRunner.query(`ALTER TABLE "cla_contracts" DROP COLUMN "itud"`);
  }
}
