import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnglishTitleToDocuments1773652179295 implements MigrationInterface {
    name = 'AddEnglishTitleToDocuments1773652179295'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" ADD "englishTitle" text`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT '51.92'`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "effectiveYear" SET DEFAULT EXTRACT(year FROM CURRENT_DATE)`);
        await queryRunner.query(`ALTER TABLE "cla_contracts" ALTER COLUMN "rsa" SET DEFAULT 51.92`);
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "englishTitle"`);
    }

}
