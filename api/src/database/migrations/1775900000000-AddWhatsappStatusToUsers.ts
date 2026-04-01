import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWhatsappStatusToUsers1775900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_whatsappstatus_enum" AS ENUM('yes', 'no', 'declined')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "whatsappStatus" "public"."users_whatsappstatus_enum" DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "whatsappStatus"`);
    await queryRunner.query(`DROP TYPE "public"."users_whatsappstatus_enum"`);
  }
}
