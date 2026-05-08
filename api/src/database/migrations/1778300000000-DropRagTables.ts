import { MigrationInterface, QueryRunner } from "typeorm";

export class DropRagTables1778300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS wiki_embeddings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS wiki_pages CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS chunk_embeddings CASCADE`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`
      CREATE TABLE wiki_pages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(255) NOT NULL UNIQUE,
        title varchar(255) NOT NULL,
        content text NOT NULL,
        path varchar(500),
        category varchar(100),
        tags text[] DEFAULT '{}',
        source_document text,
        embedding vector(1024),
        metadata jsonb DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }
}
