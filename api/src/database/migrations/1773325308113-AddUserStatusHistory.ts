import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserStatusHistory1773325308113 implements MigrationInterface {
    name = 'AddUserStatusHistory1773325308113'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_baseId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_contrattoId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_gradeId"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_grades_ruolo"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_role"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_ruolo"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_isActive"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_baseId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_contrattoId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_expiresAt"`);
        await queryRunner.query(`CREATE TYPE "public"."user_status_history_changetype_enum" AS ENUM('activation', 'deactivation', 'reactivation')`);
        await queryRunner.query(`CREATE TABLE "user_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "changeType" "public"."user_status_history_changetype_enum" NOT NULL, "reason" character varying(500), "changedById" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b94068e315e962d120caf9a2019" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "deactivatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('superadmin', 'admin', 'user')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_960c87016043c766315aa71a55" ON "grades" ("ruolo") `);
        await queryRunner.query(`CREATE INDEX "IDX_409a0298fdd86a6495e23c25c6" ON "users" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_8ac6888ff61595169707285b7e" ON "users" ("ruolo") `);
        await queryRunner.query(`CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7ba14e7bf37b438559072c2cd7" ON "users" ("crewcode") `);
        await queryRunner.query(`CREATE INDEX "IDX_56b91d98f71e3d1b649ed6e9f3" ON "refresh_tokens" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4542dd2f38a61354a040ba9fd5" ON "refresh_tokens" ("token") `);
        await queryRunner.query(`ALTER TABLE "user_status_history" ADD CONSTRAINT "FK_ee538d300bcec6d3c261558a265" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_7a036ade438de3f8aebf9a1edd6" FOREIGN KEY ("baseId") REFERENCES "bases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_2ff5e319dc6077466ec7f23aba1" FOREIGN KEY ("contrattoId") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_368f10eb63eb60bccbc37677395" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_368f10eb63eb60bccbc37677395"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_2ff5e319dc6077466ec7f23aba1"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_7a036ade438de3f8aebf9a1edd6"`);
        await queryRunner.query(`ALTER TABLE "user_status_history" DROP CONSTRAINT "FK_ee538d300bcec6d3c261558a265"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4542dd2f38a61354a040ba9fd5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56b91d98f71e3d1b649ed6e9f3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ba14e7bf37b438559072c2cd7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ac6888ff61595169707285b7e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_409a0298fdd86a6495e23c25c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_960c87016043c766315aa71a55"`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum_old" AS ENUM('superadmin', 'admin', 'user')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deactivatedAt"`);
        await queryRunner.query(`DROP TABLE "user_status_history"`);
        await queryRunner.query(`DROP TYPE "public"."user_status_history_changetype_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_expiresAt" ON "refresh_tokens" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_contrattoId" ON "users" ("contrattoId") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_baseId" ON "users" ("baseId") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_isActive" ON "users" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_ruolo" ON "users" ("ruolo") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role") `);
        await queryRunner.query(`CREATE INDEX "IDX_grades_ruolo" ON "grades" ("ruolo") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_gradeId" FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_contrattoId" FOREIGN KEY ("contrattoId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_baseId" FOREIGN KEY ("baseId") REFERENCES "bases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
