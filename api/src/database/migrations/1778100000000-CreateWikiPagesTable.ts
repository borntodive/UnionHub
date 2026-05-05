import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWikiPagesTable1778100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wiki_pages table
    await queryRunner.query(`
      CREATE TABLE wiki_pages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title varchar(255) NOT NULL,
          slug varchar(255) UNIQUE NOT NULL,
          content text NOT NULL,
          path varchar(500) NOT NULL,
          category varchar(50) NOT NULL,
          tags text[],
          source_document varchar(255),
          embedding vector(1536),
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          metadata jsonb DEFAULT '{}'
      )
    `);

    // Create IVFFlat index for similarity search
    await queryRunner.query(`
      CREATE INDEX wiki_pages_embedding_idx
      ON wiki_pages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);

    // Create category index
    await queryRunner.query(`
      CREATE INDEX wiki_pages_category_idx ON wiki_pages(category)
    `);

    // Create GIN index for tags array
    await queryRunner.query(`
      CREATE INDEX wiki_pages_tags_idx ON wiki_pages USING GIN(tags)
    `);

    // Create slug index
    await queryRunner.query(`
      CREATE INDEX wiki_pages_slug_idx ON wiki_pages(slug)
    `);

    // Create updated_at trigger function if not exists
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = now();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE TRIGGER wiki_pages_updated_at
      BEFORE UPDATE ON wiki_pages
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS wiki_pages_updated_at ON wiki_pages`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS wiki_pages_slug_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS wiki_pages_tags_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS wiki_pages_category_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS wiki_pages_embedding_idx`);
    await queryRunner.query(`DROP TABLE IF EXISTS wiki_pages`);
  }
}
