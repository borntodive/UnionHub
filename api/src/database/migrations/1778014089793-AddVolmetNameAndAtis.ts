import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolmetNameAndAtis1778014089793 implements MigrationInterface {
  name = "AddVolmetNameAndAtis1778014089793";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_device_tokens_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachments" DROP CONSTRAINT "FK_issue_attachments_issueId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_issues_solvedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_issues_urgency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_issues_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_issues_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_volmets_icao"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_volmets_region"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_volmets_isActive"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_token"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_issue_categories_ruolo"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_issue_attachments_issueId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_issues_ruolo"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_issues_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_issues_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_documents_ruolo_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_documents_ruolo_union"`);
    await queryRunner.query(
      `ALTER TABLE "documents" DROP COLUMN "rejectionReason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volmets" ADD "volmetName" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "volmets" ADD "atis" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "employmentConfirmed" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "language" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."documents_status_enum" RENAME TO "documents_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."documents_status_enum" AS ENUM('draft', 'published')`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "status" TYPE "public"."documents_status_enum" USING "status"::"text"::"public"."documents_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."documents_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT '51.92'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_977e24c520c49436d08e5eeea8" ON "device_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_adb0b47cb6c5d1d50e6ca01f61" ON "issue_categories" ("ruolo") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa36eb2ef3c45366f9f03beec6" ON "issues" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7fd6df20da19c630741ea9045" ON "issues" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc18f5227c61479d842f7514ed" ON "issues" ("ruolo") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c08d8d99adc577e56ad2c2017" ON "documents" ("ruolo", "union") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29c6db786560989df391388728" ON "documents" ("ruolo", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_511957e3e8443429dc3fb00120c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachments" ADD CONSTRAINT "FK_88b0cbed99ba64f3b6bee366043" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_aa36eb2ef3c45366f9f03beec62" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_c5d5f73371fc87bda0aaf071507" FOREIGN KEY ("categoryId") REFERENCES "issue_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_e8dff96aa11e9b52929312f0ced" FOREIGN KEY ("urgencyId") REFERENCES "issue_urgencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_25c9f1b2afe1318185fe6cd349a" FOREIGN KEY ("solvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_25c9f1b2afe1318185fe6cd349a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_e8dff96aa11e9b52929312f0ced"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_c5d5f73371fc87bda0aaf071507"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT "FK_aa36eb2ef3c45366f9f03beec62"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachments" DROP CONSTRAINT "FK_88b0cbed99ba64f3b6bee366043"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_511957e3e8443429dc3fb00120c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29c6db786560989df391388728"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c08d8d99adc577e56ad2c2017"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cc18f5227c61479d842f7514ed"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b7fd6df20da19c630741ea9045"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa36eb2ef3c45366f9f03beec6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_adb0b47cb6c5d1d50e6ca01f61"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_977e24c520c49436d08e5eeea8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(year FROM CURRENT_DATE)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT 51.92`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."documents_status_enum_old" AS ENUM('draft', 'reviewing', 'approved', 'published', 'verified', 'rejected')`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "status" TYPE "public"."documents_status_enum_old" USING "status"::"text"::"public"."documents_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."documents_status_enum_old" RENAME TO "documents_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "language" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "employmentConfirmed" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "volmets" DROP COLUMN "atis"`);
    await queryRunner.query(`ALTER TABLE "volmets" DROP COLUMN "volmetName"`);
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "rejectionReason" text`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_ruolo_union" ON "documents" ("union", "ruolo") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_ruolo_status" ON "documents" ("status", "ruolo") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_issues_userId" ON "issues" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_issues_status" ON "issues" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_issues_ruolo" ON "issues" ("ruolo") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_issue_attachments_issueId" ON "issue_attachments" ("issueId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_issue_categories_ruolo" ON "issue_categories" ("ruolo") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_userId" ON "device_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_tokens_token" ON "device_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_volmets_isActive" ON "volmets" ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_volmets_region" ON "volmets" ("region") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_volmets_icao" ON "volmets" ("icao") `,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_category" FOREIGN KEY ("categoryId") REFERENCES "issue_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_urgency" FOREIGN KEY ("urgencyId") REFERENCES "issue_urgencies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_solvedBy" FOREIGN KEY ("solvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachments" ADD CONSTRAINT "FK_issue_attachments_issueId" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_device_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
