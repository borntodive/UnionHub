import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRejectedStatusToDocuments1774200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'rejected' to the documents status enum
    await queryRunner.query(
      `ALTER TYPE "documents_status_enum" ADD VALUE IF NOT EXISTS 'rejected'`,
    );
    // Add rejectionReason column
    await queryRunner.query(
      `ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "rejectionReason" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" DROP COLUMN IF EXISTS "rejectionReason"`,
    );
    // Note: PostgreSQL does not support removing enum values without recreating the type
  }
}
