import { MigrationInterface, QueryRunner } from "typeorm";

export class RagQueryLog1775600000000 implements MigrationInterface {
  name = "RagQueryLog1775600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "query_logs" (
        "id"                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        "question"          TEXT        NOT NULL,
        "rewrittenQuestion" TEXT,
        "retrievalMode"     VARCHAR(20) NOT NULL DEFAULT 'hybrid',
        "documentIds"       JSONB       NOT NULL DEFAULT '[]',
        "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_query_logs_createdAt" ON "query_logs" ("createdAt" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "query_logs"`);
  }
}
