import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKbDocumentStatus1774500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE knowledge_base_documents
        ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'ready';
    `);

    // Mark any existing doc that has chunk_count = 0 as pending
    // (they never finished indexing)
    await queryRunner.query(`
      UPDATE knowledge_base_documents
        SET status = 'pending'
        WHERE chunk_count = 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE knowledge_base_documents DROP COLUMN IF EXISTS status;
    `);
  }
}
