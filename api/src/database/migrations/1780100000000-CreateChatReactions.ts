import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatReactions1780100000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE "chat_reactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "messageId" uuid NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "emoji" varchar(8) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_chat_reactions_msg_user_emoji" UNIQUE ("messageId", "userId", "emoji")
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE "chat_reactions"`);
  }
}
