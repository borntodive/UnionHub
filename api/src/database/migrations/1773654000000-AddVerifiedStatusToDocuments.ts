import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerifiedStatusToDocuments1742121000000 implements MigrationInterface {
  name = 'AddVerifiedStatusToDocuments1742121000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'verified' value to the enum
    // PostgreSQL doesn't allow ALTER TYPE ... ADD VALUE inside a transaction block
    // when used with IF NOT EXISTS, so we use a workaround
    await queryRunner.query(`
      ALTER TYPE "documents_status_enum" ADD VALUE IF NOT EXISTS 'verified'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum values in PostgreSQL easily
    // We would need to recreate the enum type
    // For now, we leave it as is since it's backwards compatible
    console.log('Cannot remove enum value verified - leaving as is');
  }
}
