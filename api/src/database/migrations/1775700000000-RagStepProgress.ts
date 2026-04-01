import { MigrationInterface, QueryRunner } from "typeorm";

export class RagStepProgress1775700000000 implements MigrationInterface {
  name = "RagStepProgress1775700000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // These columns only exist on databases created before RagIngestionJobs1775500000000
    // rewrote ingestion_steps from scratch. Skip gracefully if they are absent.
    const cols = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ingestion_steps'
        AND column_name IN ('progress_current', 'progress_total')
    `);
    const names = cols.map((r: { column_name: string }) => r.column_name);

    if (names.includes("progress_current")) {
      await queryRunner.query(
        `ALTER TABLE "ingestion_steps" RENAME COLUMN "progress_current" TO "progressCurrent"`,
      );
    }
    if (names.includes("progress_total")) {
      await queryRunner.query(
        `ALTER TABLE "ingestion_steps" RENAME COLUMN "progress_total" TO "progressTotal"`,
      );
    }
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
