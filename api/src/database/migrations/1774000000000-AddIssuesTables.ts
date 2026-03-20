import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIssuesTables1774000000000 implements MigrationInterface {
  name = "AddIssuesTables1774000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create issue_status_enum (new enum)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status_enum') THEN
          CREATE TYPE "issue_status_enum" AS ENUM ('open', 'in_progress', 'solved');
        END IF;
      END
      $$;
    `);

    // Create issue_categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "issue_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nameIt" character varying(100) NOT NULL,
        "nameEn" character varying(100) NOT NULL,
        "ruolo" "ruolo_enum" NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_issue_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_issue_categories_ruolo" ON "issue_categories" ("ruolo")`,
    );

    // Create issue_urgencies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "issue_urgencies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nameIt" character varying(100) NOT NULL,
        "nameEn" character varying(100) NOT NULL,
        "level" integer NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_issue_urgencies" PRIMARY KEY ("id")
      )
    `);

    // Create issues table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "issues" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "ruolo" "ruolo_enum" NOT NULL,
        "status" "issue_status_enum" NOT NULL DEFAULT 'open',
        "userId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "urgencyId" uuid NOT NULL,
        "adminNotes" text,
        "solvedAt" TIMESTAMPTZ,
        "solvedById" uuid,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_issues" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issues_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issues_category" FOREIGN KEY ("categoryId") REFERENCES "issue_categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_issues_urgency" FOREIGN KEY ("urgencyId") REFERENCES "issue_urgencies"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_issues_solvedBy" FOREIGN KEY ("solvedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_issues_ruolo" ON "issues" ("ruolo")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_issues_status" ON "issues" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_issues_userId" ON "issues" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "issues"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "issue_urgencies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "issue_categories"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "issue_status_enum"`);
  }
}
