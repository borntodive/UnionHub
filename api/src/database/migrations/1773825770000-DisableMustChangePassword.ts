import { MigrationInterface, QueryRunner } from "typeorm";

export class DisableMustChangePassword1773825770000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users 
      SET "mustChangePassword" = false 
      WHERE "mustChangePassword" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Non reversibile - non riattiviamo il cambio password obbligatorio
  }
}
