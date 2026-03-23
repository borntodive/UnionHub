import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKnowledgeBase1774300000000 implements MigrationInterface {
  name = "CreateKnowledgeBase1774300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(`
      CREATE TABLE "knowledge_base_documents" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" VARCHAR NOT NULL,
        "filename" VARCHAR NOT NULL,
        "access_level" VARCHAR NOT NULL DEFAULT 'all',
        "ruolo" VARCHAR,
        "file_data" BYTEA,
        "extracted_text" TEXT,
        "chunk_count" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "knowledge_base_chunks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_id" UUID REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
        "chunk_index" INTEGER NOT NULL,
        "content" TEXT NOT NULL,
        "token_count" INTEGER,
        "embedding" vector(768),
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX ON knowledge_base_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_base_chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_base_documents"`);
  }
}
