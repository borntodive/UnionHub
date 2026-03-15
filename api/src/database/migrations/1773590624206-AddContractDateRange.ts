import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContractDateRange1773590624206 implements MigrationInterface {
    name = 'AddContractDateRange1773590624206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cla_contracts" ADD "effectiveMonth" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ADD "endYear" integer`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ADD "endMonth" integer`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT '51.92'`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(year FROM CURRENT_DATE)`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT 51.92`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" DROP COLUMN "endMonth"`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" DROP COLUMN "endYear"`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" DROP COLUMN "effectiveMonth"`);
    }

}
