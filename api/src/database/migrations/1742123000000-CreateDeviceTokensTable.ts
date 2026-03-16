import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeviceTokensTable1742123000000 implements MigrationInterface {
  name = 'CreateDeviceTokensTable1742123000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "device_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying NOT NULL,
        "platform" character varying NOT NULL DEFAULT 'expo',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastUsedAt" TIMESTAMP,
        CONSTRAINT "PK_device_tokens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_device_tokens_token" ON "device_tokens" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_device_tokens_userId" ON "device_tokens" ("userId")
    `);

    await queryRunner.query(`
      ALTER TABLE "device_tokens" 
      ADD CONSTRAINT "FK_device_tokens_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "device_tokens"`);
  }
}
