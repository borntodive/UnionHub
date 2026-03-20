import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnionToDocuments1773653000000 implements MigrationInterface {
  name = "AddUnionToDocuments1773653000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'documents_union_enum') THEN
          CREATE TYPE "documents_union_enum" AS ENUM ('fit-cisl', 'joint');
        END IF;
      END
      $$;
    `);

    // Add column if not exists
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD COLUMN IF NOT EXISTS "union" "documents_union_enum" NOT NULL DEFAULT 'fit-cisl'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents" DROP COLUMN "union"
    `);

    await queryRunner.query(`
      DROP TYPE "documents_union_enum"
    `);
  }
}
