"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddStatusLogToUsers1773345010829 = void 0;
class AddStatusLogToUsers1773345010829 {
    constructor() {
        this.name = 'AddStatusLogToUsers1773345010829';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD "statusLog" jsonb`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "statusLog"`);
    }
}
exports.AddStatusLogToUsers1773345010829 = AddStatusLogToUsers1773345010829;
//# sourceMappingURL=1773345010829-AddStatusLogToUsers.js.map