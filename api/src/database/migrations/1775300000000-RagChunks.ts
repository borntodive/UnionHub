import { MigrationInterface, QueryRunner } from "typeorm";

export class RagChunks1775300000000 implements MigrationInterface {
  name = "RagChunks1775300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chunk_type_enum') THEN
          CREATE TYPE "chunk_type_enum" AS ENUM ('text', 'table', 'header', 'list');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "chunks" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "documentId"   UUID             NOT NULL REFERENCES "rag_documents"("id") ON DELETE CASCADE,
        "versionId"    UUID                      REFERENCES "document_versions"("id") ON DELETE SET NULL,
        "sectionCode"  VARCHAR(50),
        "sectionTitle" VARCHAR(300),
        "pageStart"    INTEGER,
        "pageEnd"      INTEGER,
        "chunkType"    "chunk_type_enum" NOT NULL DEFAULT 'text',
        "chunkIndex"   INTEGER           NOT NULL DEFAULT 0,
        "textContent"  TEXT              NOT NULL,
        "tableJson"    JSONB,
        "metadata"     JSONB             NOT NULL DEFAULT '{}',
        "tokenCount"   INTEGER,
        "searchVector" TSVECTOR GENERATED ALWAYS AS (
          to_tsvector('simple',
            coalesce("sectionCode", '') || ' ' ||
            coalesce("sectionTitle", '') || ' ' ||
            coalesce("textContent", '')
          )
        ) STORED,
        "createdAt"    TIMESTAMPTZ       NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_chunks_documentId" ON "chunks" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chunks_versionId" ON "chunks" ("versionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chunks_searchVector" ON "chunks" USING GIN ("searchVector")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chunks_trgm" ON "chunks" USING GIN ("textContent" gin_trgm_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chunks"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "chunk_type_enum"`);
  }
}
