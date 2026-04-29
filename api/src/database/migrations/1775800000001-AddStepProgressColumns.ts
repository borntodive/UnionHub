import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStepProgressColumns1775800000001 implements MigrationInterface {
  name = "AddStepProgressColumns1775800000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist (maybe they were added manually)
    const cols = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ingestion_steps'
        AND column_name IN ('progressCurrent', 'progressTotal')
    `);
    const names = cols.map((r: { column_name: string }) => r.column_name);

    if (!names.includes("progressCurrent")) {
      await queryRunner.query(`
        ALTER TABLE "ingestion_steps"
        ADD COLUMN "progressCurrent" INTEGER
      `);
    }
    if (!names.includes("progressTotal")) {
      await queryRunner.query(`
        ALTER TABLE "ingestion_steps"
        ADD COLUMN "progressTotal" INTEGER
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ingestion_steps" DROP COLUMN "progressCurrent"
    `);
    await queryRunner.query(`
      ALTER TABLE "ingestion_steps" DROP COLUMN "progressTotal"
    `);
  }
}
