import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnionToDocuments1742120000000 implements MigrationInterface {
  name = 'AddUnionToDocuments1742120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type
    await queryRunner.query(`
      CREATE TYPE "documents_union_enum" AS ENUM ('fit-cisl', 'joint')
    `);
    
    // Add column
    await queryRunner.query(`
      ALTER TABLE "documents" 
      ADD COLUMN "union" "documents_union_enum" NOT NULL DEFAULT 'fit-cisl'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents" DROP COLUMN "union"
    `);
    
    await queryRunner.query(`
      DROP TYPE "documents_union_enum"
    `);
  }
}
