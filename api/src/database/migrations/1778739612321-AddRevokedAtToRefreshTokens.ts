import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRevokedAtToRefreshTokens1778739612321 implements MigrationInterface {
  name = "AddRevokedAtToRefreshTokens1778739612321";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "revokedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "revokedAt"`,
    );
  }
}
