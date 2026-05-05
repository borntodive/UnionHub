import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVolmetsTable1778100000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "volmets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "icao" character varying(4) NOT NULL,
        "name" character varying(100) NOT NULL,
        "city" character varying(100) NOT NULL,
        "country" character varying(2) NOT NULL,
        "frequencies" jsonb NOT NULL DEFAULT '[]',
        "region" character varying(50) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_volmets_icao" UNIQUE ("icao"),
        CONSTRAINT "PK_volmets" PRIMARY KEY ("id")
      )
    `);

    // Create index on icao for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_volmets_icao" ON "volmets" ("icao")
    `);

    // Create index on region for filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_volmets_region" ON "volmets" ("region")
    `);

    // Create index on isActive for filtering active entries
    await queryRunner.query(`
      CREATE INDEX "IDX_volmets_isActive" ON "volmets" ("isActive")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "volmets"`);
  }
}
