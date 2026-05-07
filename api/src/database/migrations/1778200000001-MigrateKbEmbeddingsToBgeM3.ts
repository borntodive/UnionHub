import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 3 KB migration:
 * 1. Drop wiki_embeddings (legacy LangChain chunks — never queried, only written)
 * 2. Drop and recreate wiki_pages.embedding as vector(1024) for BAAI/bge-m3
 *    (was vector(1536) from openai/text-embedding-3-small)
 * Existing page rows are kept; embeddings are regenerated via POST /ai/kb/ingest.
 */
export class MigrateKbEmbeddingsToBgeM31778200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop legacy chunk table
    await queryRunner.query(`DROP TABLE IF EXISTS wiki_embeddings`);

    // Drop old ivfflat index (dimension-specific, must recreate)
    await queryRunner.query(`DROP INDEX IF EXISTS wiki_pages_embedding_idx`);

    // Change embedding column to 1024 dims (bge-m3), nulling existing values
    await queryRunner.query(
      `ALTER TABLE wiki_pages DROP COLUMN IF EXISTS embedding`,
    );
    await queryRunner.query(
      `ALTER TABLE wiki_pages ADD COLUMN embedding vector(1024)`,
    );

    // Recreate ivfflat index for new dimensions
    // lists=10 safe for small tables; bump to 100 after loading data
    await queryRunner.query(
      `CREATE INDEX wiki_pages_embedding_idx
       ON wiki_pages USING ivfflat (embedding vector_cosine_ops)
       WITH (lists = 10)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS wiki_pages_embedding_idx`);
    await queryRunner.query(
      `ALTER TABLE wiki_pages DROP COLUMN IF EXISTS embedding`,
    );
    await queryRunner.query(
      `ALTER TABLE wiki_pages ADD COLUMN embedding vector(1536)`,
    );
    await queryRunner.query(
      `CREATE INDEX wiki_pages_embedding_idx
       ON wiki_pages USING ivfflat (embedding vector_cosine_ops)
       WITH (lists = 100)`,
    );
    // wiki_embeddings is not restored — data is gone
  }
}
