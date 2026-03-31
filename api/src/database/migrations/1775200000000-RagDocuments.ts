import { MigrationInterface, QueryRunner } from "typeorm";

export class RagDocuments1775200000000 implements MigrationInterface {
  name = "RagDocuments1775200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "rag_documents" (
        "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code"           VARCHAR(50)  NOT NULL UNIQUE,
        "title"          VARCHAR(300) NOT NULL,
        "manualPart"     VARCHAR(100),
        "issue"          VARCHAR(20),
        "revision"       VARCHAR(20),
        "revisionDate"   DATE,
        "sourceFileName" VARCHAR(300) NOT NULL,
        "filePath"       VARCHAR(500) NOT NULL,
        "sha256"         CHAR(64)     NOT NULL,
        "isActive"       BOOLEAN      NOT NULL DEFAULT TRUE,
        "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_rag_documents_code" ON "rag_documents" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rag_documents_isActive" ON "rag_documents" ("isActive")`,
    );

    await queryRunner.query(`
      CREATE TABLE "document_versions" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "documentId"   UUID        NOT NULL REFERENCES "rag_documents"("id") ON DELETE CASCADE,
        "versionLabel" VARCHAR(50) NOT NULL,
        "issue"        VARCHAR(20),
        "revision"     VARCHAR(20),
        "revisionDate" DATE,
        "isCurrent"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_doc_versions_documentId" ON "document_versions" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_doc_versions_isCurrent" ON "document_versions" ("documentId", "isCurrent")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rag_documents"`);
  }
}
