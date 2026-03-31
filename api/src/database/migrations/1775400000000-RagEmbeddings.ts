import { MigrationInterface, QueryRunner } from "typeorm";

export class RagEmbeddings1775400000000 implements MigrationInterface {
  name = "RagEmbeddings1775400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chunk_embeddings" (
        "chunkId"   UUID         PRIMARY KEY REFERENCES "chunks"("id") ON DELETE CASCADE,
        "embedding" vector(1024) NOT NULL,
        "model"     VARCHAR(100) NOT NULL DEFAULT 'bge-m3',
        "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    // IVFFlat index intentionally omitted here.
    // Creating it on an empty table produces broken centroids (see TROUBLESHOOTING in CLAUDE.md).
    // The ingestion processor creates it automatically after the first batch of embeddings is stored.
    // To create manually after data load:
    //   CREATE INDEX "IDX_chunk_emb_ivfflat" ON "chunk_embeddings"
    //     USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chunk_embeddings"`);
  }
}
