import { MigrationInterface, QueryRunner } from "typeorm";
export declare class AddStatusLogToUsers1773345010829 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
