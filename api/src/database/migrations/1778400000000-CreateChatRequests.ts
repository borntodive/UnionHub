import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatRequests1778400000000 implements MigrationInterface {
  name = "CreateChatRequests1778400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_requests" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "userId" UUID,
        "question" TEXT NOT NULL,
        "answer" TEXT NOT NULL,
        "citations" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_chat_requests_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_chat_requests_userId" ON "chat_requests" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_requests_createdAt" ON "chat_requests" ("createdAt" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_chat_requests_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_requests_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_requests"`);
  }
}
