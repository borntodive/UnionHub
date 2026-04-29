import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterEmbeddingVectorDimensions1775800000002 implements MigrationInterface {
  name = "AlterEmbeddingVectorDimensions1775800000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the IVFFlat index first (it depends on the vector column)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chunk_emb_ivfflat"`);

    // Alter the vector column from 1024 to 1536 dimensions (for text-embedding-3-small)
    await queryRunner.query(`
      ALTER TABLE "chunk_embeddings"
      ALTER COLUMN "embedding" TYPE vector(1536)
    `);

    // Recreate the IVFFlat index with the new dimensions
    // Note: IVFFlat indexes require data to exist. Will be recreated after data load.
    this.log(
      "Vector column altered to 1536 dimensions. IVFFlat index will be recreated after data load.",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the IVFFlat index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chunk_emb_ivfflat"`);

    // Revert to 1024 dimensions
    await queryRunner.query(`
      ALTER TABLE "chunk_embeddings"
      ALTER COLUMN "embedding" TYPE vector(1024)
    `);
  }

  private log(message: string): void {
    console.log(`[Migration] ${message}`);
  }
}
