import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIssueAttachments1776000000000 implements MigrationInterface {
  name = "AddIssueAttachments1776000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "issue_attachments" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "issueId" UUID NOT NULL,
        "filename" VARCHAR(500) NOT NULL,
        "originalName" VARCHAR(500) NOT NULL,
        "mimeType" VARCHAR(100) NOT NULL,
        "size" INTEGER NOT NULL,
        "url" VARCHAR(1000) NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT "FK_issue_attachments_issueId"
          FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_issue_attachments_issueId" ON "issue_attachments" ("issueId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_issue_attachments_issueId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "issue_attachments"`);
  }
}
