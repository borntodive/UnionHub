"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDataIscrizioneToUsers1773310499462 = void 0;
class AddDataIscrizioneToUsers1773310499462 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "dataIscrizione" date
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "dataIscrizione"
        `);
    }
}
exports.AddDataIscrizioneToUsers1773310499462 = AddDataIscrizioneToUsers1773310499462;
//# sourceMappingURL=1773310499462-AddDataIscrizioneToUsers.js.map