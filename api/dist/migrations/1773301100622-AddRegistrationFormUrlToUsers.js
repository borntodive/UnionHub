"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddRegistrationFormUrlToUsers1773301100622 = void 0;
class AddRegistrationFormUrlToUsers1773301100622 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "registrationFormUrl" character varying(500)
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "registrationFormUrl"
        `);
    }
}
exports.AddRegistrationFormUrlToUsers1773301100622 = AddRegistrationFormUrlToUsers1773301100622;
//# sourceMappingURL=1773301100622-AddRegistrationFormUrlToUsers.js.map