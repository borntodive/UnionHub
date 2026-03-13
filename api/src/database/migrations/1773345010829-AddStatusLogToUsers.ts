import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusLogToUsers1773345010829 implements MigrationInterface {
    name = 'AddStatusLogToUsers1773345010829'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "statusLog" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "statusLog"`);
    }

}
