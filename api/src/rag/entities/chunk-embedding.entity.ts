import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { Chunk } from "./chunk.entity";

/**
 * The actual DB column type is vector(1024) — set by migration.
 * TypeORM does not know this type, so we use a text transformer that
 * serializes number[] ↔ "[0.1,0.2,...]".
 * All similarity queries use raw SQL via QueryBuilder.
 */
const vectorTransformer = {
  to: (value: number[] | null): string | null =>
    value ? `[${value.join(",")}]` : null,
  from: (value: string | null): number[] | null =>
    value ? value.slice(1, -1).split(",").map(Number) : null,
};

@Entity("chunk_embeddings")
export class ChunkEmbedding {
  @PrimaryColumn({ type: "uuid" })
  chunkId: string;

  @OneToOne(() => Chunk, (c) => c.embedding, { onDelete: "CASCADE" })
  @JoinColumn({ name: "chunkId" })
  chunk: Chunk;

  // Integration note: declared as text so TypeORM can bind values.
  // The actual column is vector(1024) — managed by migration.
  @Column({ type: "text", transformer: vectorTransformer })
  embedding: number[];

  @Column({ type: "varchar", length: 100, default: "bge-m3" })
  model: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
