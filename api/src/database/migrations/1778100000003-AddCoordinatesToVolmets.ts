import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCoordinatesToVolmets1778100000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "volmets"
      ADD COLUMN "latitude" numeric(10,7)
    `);
    await queryRunner.query(`
      ALTER TABLE "volmets"
      ADD COLUMN "longitude" numeric(11,7)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "volmets" DROP COLUMN "latitude"
    `);
    await queryRunner.query(`
      ALTER TABLE "volmets" DROP COLUMN "longitude"
    `);
  }
}
