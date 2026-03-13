import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetup20250309160000 implements MigrationInterface {
  name = 'InitialSetup20250309160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('superadmin', 'admin', 'user')
    `);
    await queryRunner.query(`
      CREATE TYPE "ruolo_enum" AS ENUM ('pilot', 'cabin_crew')
    `);

    // Create bases table
    await queryRunner.query(`
      CREATE TABLE "bases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "codice" character varying(20) NOT NULL,
        "nome" character varying(100) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_bases_codice" UNIQUE ("codice"),
        CONSTRAINT "PK_bases" PRIMARY KEY ("id")
      )
    `);

    // Create contracts table
    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "codice" character varying(20) NOT NULL,
        "nome" character varying(100) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_contracts_codice" UNIQUE ("codice"),
        CONSTRAINT "PK_contracts" PRIMARY KEY ("id")
      )
    `);

    // Create grades table
    await queryRunner.query(`
      CREATE TABLE "grades" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "codice" character varying(20) NOT NULL,
        "nome" character varying(100) NOT NULL,
        "ruolo" "ruolo_enum" NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_grades" PRIMARY KEY ("id")
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "crewcode" character varying(50) NOT NULL,
        "password" character varying(255) NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'user',
        "mustChangePassword" boolean NOT NULL DEFAULT true,
        "isActive" boolean NOT NULL DEFAULT true,
        "ruolo" "ruolo_enum",
        "nome" character varying(100) NOT NULL,
        "cognome" character varying(100) NOT NULL,
        "email" character varying(255) NOT NULL,
        "telefono" character varying(30),
        "baseId" uuid,
        "contrattoId" uuid,
        "gradeId" uuid,
        "note" text,
        "itud" boolean NOT NULL DEFAULT false,
        "rsa" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_crewcode" UNIQUE ("crewcode"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "token" character varying(500) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "ipAddress" character varying(45),
        "userAgent" character varying(255),
        "isRevoked" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_refresh_tokens_token" UNIQUE ("token"),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_users_role" ON "users" ("role")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_ruolo" ON "users" ("ruolo")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_isActive" ON "users" ("isActive")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_baseId" ON "users" ("baseId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_contrattoId" ON "users" ("contrattoId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_grades_ruolo" ON "grades" ("ruolo")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_expiresAt" ON "refresh_tokens" ("expiresAt")
    `);

    // Create foreign keys
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_baseId" 
      FOREIGN KEY ("baseId") REFERENCES "bases"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_contrattoId" 
      FOREIGN KEY ("contrattoId") REFERENCES "contracts"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_gradeId" 
      FOREIGN KEY ("gradeId") REFERENCES "grades"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_refresh_tokens_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_userId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_gradeId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_contrattoId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_baseId"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_expiresAt"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_grades_ruolo"`);
    await queryRunner.query(`DROP INDEX "IDX_users_contrattoId"`);
    await queryRunner.query(`DROP INDEX "IDX_users_baseId"`);
    await queryRunner.query(`DROP INDEX "IDX_users_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_users_ruolo"`);
    await queryRunner.query(`DROP INDEX "IDX_users_role"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "grades"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP TABLE "bases"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "ruolo_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
