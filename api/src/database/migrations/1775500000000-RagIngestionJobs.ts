import { MigrationInterface, QueryRunner } from "typeorm";

export class RagIngestionJobs1775500000000 implements MigrationInterface {
  name = "RagIngestionJobs1775500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_status_enum') THEN
          CREATE TYPE "ingestion_status_enum" AS ENUM (
            'pending', 'running', 'completed', 'failed', 'retrying'
          );
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "ingestion_jobs" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "documentId"   UUID                      NOT NULL REFERENCES "rag_documents"("id") ON DELETE CASCADE,
        "status"       "ingestion_status_enum"   NOT NULL DEFAULT 'pending',
        "startedAt"    TIMESTAMPTZ,
        "finishedAt"   TIMESTAMPTZ,
        "errorMessage" TEXT,
        "createdAt"    TIMESTAMPTZ               NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_ingestion_jobs_documentId" ON "ingestion_jobs" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ingestion_jobs_status" ON "ingestion_jobs" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "ingestion_steps" (
        "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "jobId"        UUID                      NOT NULL REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE,
        "stepName"     VARCHAR(100)              NOT NULL,
        "status"       "ingestion_status_enum"   NOT NULL DEFAULT 'pending',
        "payload"      JSONB                     NOT NULL DEFAULT '{}',
        "errorMessage" TEXT,
        "createdAt"    TIMESTAMPTZ               NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_ingestion_steps_jobId" ON "ingestion_steps" ("jobId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ingestion_steps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ingestion_jobs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ingestion_status_enum"`);
  }
}
