import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWikiEmbeddingsTable1778000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Create wiki_embeddings table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS wiki_embeddings (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                content text NOT NULL,
                metadata jsonb,
                embedding vector(1536),
                created_at timestamptz DEFAULT now()
            )
        `);

    // Create ivfflat index for similarity search
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS wiki_embeddings_embedding_idx
            ON wiki_embeddings
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS wiki_embeddings_embedding_idx`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS wiki_embeddings`);
    // Note: we don't drop the vector extension as other tables might use it
  }
}
