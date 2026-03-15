import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClaContractsTables1773589585669 implements MigrationInterface {
    name = 'AddClaContractsTables1773589585669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cla_contracts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company" character varying(10) NOT NULL DEFAULT 'RYR', "role" character varying(10) NOT NULL, "rank" character varying(10) NOT NULL, "basic" numeric(10,2) NOT NULL DEFAULT '0', "ffp" numeric(10,2) NOT NULL DEFAULT '0', "sbh" numeric(10,4) NOT NULL DEFAULT '0', "al" numeric(10,2) NOT NULL DEFAULT '0', "oob" numeric(10,2) NOT NULL DEFAULT '0', "woff" numeric(10,2) NOT NULL DEFAULT '0', "allowance" numeric(10,2) NOT NULL DEFAULT '0', "diaria" numeric(10,4) NOT NULL DEFAULT '0', "rsa" numeric(10,2) NOT NULL DEFAULT '51.92', "trainingConfig" jsonb, "effectiveYear" integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE), "isActive" boolean NOT NULL DEFAULT true, "version" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "createdBy" uuid NOT NULL, "updatedBy" uuid, CONSTRAINT "PK_8124f265137d054ed1a0c2f3688" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cla_contract_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contractId" uuid, "action" character varying(20) NOT NULL, "performedBy" uuid NOT NULL, "performerCrewcode" character varying(20) NOT NULL, "dataSnapshot" jsonb NOT NULL, "changes" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7684d909aa8890bfaf59e997b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ed97bdbd384ad28e63d06bb65d" ON "cla_contract_history" ("contractId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ed97bdbd384ad28e63d06bb65d"`);
        await queryRunner.query(`DROP TABLE "cla_contract_history"`);
        await queryRunner.query(`DROP TABLE "cla_contracts"`);
    }

}
