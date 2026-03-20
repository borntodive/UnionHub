import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRuoloToDocuments1773655000000 implements MigrationInterface {
  name = "AddRuoloToDocuments1773655000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documents_ruolo_enum') THEN
          CREATE TYPE "documents_ruolo_enum" AS ENUM ('pilot', 'cabin_crew');
        END IF;
      END
      $$;
    `);

    // Add column if not exists
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD COLUMN IF NOT EXISTS "ruolo" "documents_ruolo_enum" NOT NULL DEFAULT 'pilot'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents" DROP COLUMN "ruolo"
    `);

    await queryRunner.query(`
      DROP TYPE "documents_ruolo_enum"
    `);
  }
}
