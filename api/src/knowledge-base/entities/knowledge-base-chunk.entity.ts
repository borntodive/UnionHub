import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { KnowledgeBaseDocument } from "./knowledge-base-document.entity";

@Entity("knowledge_base_chunks")
export class KnowledgeBaseChunk {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => KnowledgeBaseDocument, (doc) => doc.chunks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "document_id" })
  document: KnowledgeBaseDocument;

  @Column({ name: "chunk_index", type: "integer" })
  chunkIndex: number;

  @Column({ type: "text" })
  content: string;

  @Column({ name: "token_count", type: "integer", nullable: true })
  tokenCount: number | null;

  // NOTE: The 'embedding vector(768)' column is NOT declared here.
  // TypeORM does not natively support pgvector. The column is created by the
  // migration using raw SQL, and all embedding operations use DataSource.query().

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
