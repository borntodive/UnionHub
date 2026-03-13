import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDataIscrizioneToUsers1773310499462 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "dataIscrizione" date
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "dataIscrizione"
        `);
    }

}
