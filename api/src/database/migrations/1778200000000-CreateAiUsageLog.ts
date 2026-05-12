import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAiUsageLog1778200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ai`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ai.usage_log (
        id                    BIGSERIAL PRIMARY KEY,
        function              TEXT        NOT NULL,
        user_id               TEXT,
        model                 TEXT        NOT NULL,
        input_tokens          INT         NOT NULL DEFAULT 0,
        output_tokens         INT         NOT NULL DEFAULT 0,
        cache_read_tokens     INT         NOT NULL DEFAULT 0,
        cache_creation_tokens INT         NOT NULL DEFAULT 0,
        latency_ms            INT         NOT NULL DEFAULT 0,
        cost_usd              NUMERIC(10,6) NOT NULL DEFAULT 0,
        success               BOOLEAN     NOT NULL DEFAULT TRUE,
        error                 TEXT,
        metadata              JSONB,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_usage_function_created
       ON ai.usage_log (function, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
       ON ai.usage_log (user_id, created_at DESC)
       WHERE user_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_usage_created
       ON ai.usage_log (created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ai.usage_log`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS ai`);
  }
}
