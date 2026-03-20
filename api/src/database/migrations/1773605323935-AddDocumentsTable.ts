import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentsTable1773605323935 implements MigrationInterface {
  name = "AddDocumentsTable1773605323935";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."documents_status_enum" AS ENUM('draft', 'reviewing', 'approved', 'published')`,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "originalContent" text NOT NULL, "aiReviewedContent" text, "englishTranslation" text, "finalPdfUrl" text, "status" "public"."documents_status_enum" NOT NULL DEFAULT 'draft', "createdBy" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "publishedAt" TIMESTAMP, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT '51.92'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_a798977779130148497db432d55" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_a798977779130148497db432d55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(year FROM CURRENT_DATE)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT 51.92`,
    );
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
  }
}
