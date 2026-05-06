import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRunwaysTable1778015000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "runways" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "icao" character varying(4) NOT NULL,
        "number" character varying(10) NOT NULL,
        "heading" integer NOT NULL,
        "length" integer,
        "width" integer,
        "surface" character varying(50),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_runways" PRIMARY KEY ("id")
      )
    `);

    // Create index on icao for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_runways_icao" ON "runways" ("icao")
    `);

    // Create unique constraint on icao + number combination
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_runways_icao_number" ON "runways" ("icao", "number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "runways"`);
  }
}
