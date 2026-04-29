import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRagDocumentVisibility1745136000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add visibility column with default PUBLIC for existing docs
    await queryRunner.query(`
      ALTER TABLE rag_documents
      ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'
    `);

    // Create index for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_rag_documents_visibility
      ON rag_documents(visibility)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS IDX_rag_documents_visibility`,
    );
    await queryRunner.query(
      `ALTER TABLE rag_documents DROP COLUMN IF EXISTS visibility`,
    );
  }
}
