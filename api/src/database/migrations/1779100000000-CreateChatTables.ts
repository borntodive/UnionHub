import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatTables1779100000000 implements MigrationInterface {
  name = "CreateChatTables1779100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" character varying(100) NOT NULL,
        "senderId" uuid NOT NULL,
        "content" text,
        "isPinned" boolean NOT NULL DEFAULT false,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_messages_roomId_createdAt"
      ON "chat_messages" ("roomId", "createdAt" DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_sender"
      FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "messageId" uuid,
        "originalName" character varying(255) NOT NULL,
        "filename" character varying(255) NOT NULL,
        "mimeType" character varying(100) NOT NULL,
        "size" integer NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_attachments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_attachments"
      ADD CONSTRAINT "FK_chat_attachments_message"
      FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
  }
}
