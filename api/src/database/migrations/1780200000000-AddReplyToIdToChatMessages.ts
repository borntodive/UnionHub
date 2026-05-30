import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReplyToIdToChatMessages1780200000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE "chat_messages"
        ADD COLUMN "replyToId" uuid REFERENCES "chat_messages"("id") ON DELETE SET NULL
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE "chat_messages" DROP COLUMN "replyToId"
    `);
  }
}
