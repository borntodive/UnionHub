import { MigrationInterface, QueryRunner } from "typeorm";

export class RagEnableExtensions1775100000000 implements MigrationInterface {
  name = "RagEnableExtensions1775100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Extensions are shared — intentionally not dropped to avoid breaking other features.
  }
}
