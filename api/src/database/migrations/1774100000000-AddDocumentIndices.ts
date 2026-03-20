import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentIndices1774100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_documents_ruolo_status" ON "documents" ("ruolo", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_documents_ruolo_union" ON "documents" ("ruolo", "union")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_documents_ruolo_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_documents_ruolo_union"`);
  }
}
