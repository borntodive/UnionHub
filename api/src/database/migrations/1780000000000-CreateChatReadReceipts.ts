import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatReadReceipts1780000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE "chat_read_receipts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "roomId" varchar(100) NOT NULL,
        "lastReadAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_chat_read_receipts_user_room" UNIQUE ("userId", "roomId")
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE "chat_read_receipts"`);
  }
}
