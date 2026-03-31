import { MigrationInterface, QueryRunner } from "typeorm";

export class RagStepProgress1775700000000 implements MigrationInterface {
  name = "RagStepProgress1775700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ingestion_steps"
      RENAME COLUMN "progress_current" TO "progressCurrent"
    `);
    await queryRunner.query(`
      ALTER TABLE "ingestion_steps"
      RENAME COLUMN "progress_total" TO "progressTotal"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ingestion_steps"
      RENAME COLUMN "progressCurrent" TO "progress_current"
    `);
    await queryRunner.query(`
      ALTER TABLE "ingestion_steps"
      RENAME COLUMN "progressTotal" TO "progress_total"
    `);
  }
}
