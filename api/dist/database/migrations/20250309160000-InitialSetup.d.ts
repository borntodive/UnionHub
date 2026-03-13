import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class InitialSetup20250309160000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
