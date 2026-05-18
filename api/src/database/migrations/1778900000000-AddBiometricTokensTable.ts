import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBiometricTokensTable1778900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "biometric_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying(64) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_biometric_tokens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "biometric_tokens"
        ADD CONSTRAINT "FK_biometric_tokens_user"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_biometric_tokens_token"
        ON "biometric_tokens" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_biometric_tokens_userId"
        ON "biometric_tokens" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_biometric_tokens_expiresAt"
        ON "biometric_tokens" ("expiresAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "biometric_tokens"`);
  }
}
