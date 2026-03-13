import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRegistrationFormUrlToUsers1773301100622 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "registrationFormUrl" character varying(500)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "registrationFormUrl"
        `);
    }

}
