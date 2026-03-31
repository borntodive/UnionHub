import { MigrationInterface, QueryRunner } from "typeorm";

export class DropChatbotTables1775000000000 implements MigrationInterface {
  name = "DropChatbotTables1775000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in order (respecting foreign keys)
    await queryRunner.query(
      `DROP TABLE IF EXISTS "knowledge_base_chunks" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "knowledge_base_documents" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate chat_messages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES users(id) ON DELETE CASCADE,
        "conversation_id" UUID NOT NULL,
        "role" VARCHAR NOT NULL,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ON chat_messages (user_id, conversation_id, created_at)
    `);

    // Recreate knowledge_base_documents table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_base_documents" (
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

    // Recreate knowledge_base_chunks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_base_chunks" (
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
      CREATE INDEX IF NOT EXISTS ON knowledge_base_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);
  }
}
