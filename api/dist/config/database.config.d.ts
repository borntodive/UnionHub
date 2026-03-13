import { DataSource } from 'typeorm';
declare const _default: (() => {
    type: "postgres";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entities: string[];
    migrations: string[];
    synchronize: boolean;
    logging: boolean;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    type: "postgres";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entities: string[];
    migrations: string[];
    synchronize: boolean;
    logging: boolean;
}>;
export default _default;
export declare const connectionSource: DataSource;
