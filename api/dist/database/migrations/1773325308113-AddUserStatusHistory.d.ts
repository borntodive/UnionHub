import { MigrationInterface, QueryRunner } from "typeorm";
export declare class AddUserStatusHistory1773325308113 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
