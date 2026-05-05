import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIataToVolmets1778100000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "volmets"
      ADD COLUMN "iata" character varying(3)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "volmets" DROP COLUMN "iata"
    `);
  }
}
