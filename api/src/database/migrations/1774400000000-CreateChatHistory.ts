import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatHistory1774400000000 implements MigrationInterface {
  name = "CreateChatHistory1774400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES users(id) ON DELETE CASCADE,
        "conversation_id" UUID NOT NULL,
        "role" VARCHAR NOT NULL,
        "content" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX ON chat_messages (user_id, conversation_id, created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
  }
}
