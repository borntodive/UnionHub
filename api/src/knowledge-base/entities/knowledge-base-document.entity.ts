import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { KnowledgeBaseChunk } from "./knowledge-base-chunk.entity";

export type KbAccessLevel = "all" | "admin";

@Entity("knowledge_base_documents")
export class KnowledgeBaseDocument {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "varchar" })
  filename: string;

  /** 'all' = visible to every authenticated user; 'admin' = admin/superadmin only */
  @Column({ name: "access_level", type: "varchar", default: "all" })
  accessLevel: KbAccessLevel;

  /** Optional: restrict to a specific professional role (null = all roles) */
  @Column({ type: "varchar", nullable: true })
  ruolo: string | null;

  /** Raw PDF bytes — kept for re-indexing when the embedding model changes */
  @Column({ name: "file_data", type: "bytea", nullable: true, select: false })
  fileData: Buffer | null;

  /** Plain text extracted from the PDF by pdf-parse */
  @Column({ name: "extracted_text", type: "text", nullable: true })
  extractedText: string | null;

  @Column({ name: "chunk_count", type: "integer", default: 0 })
  chunkCount: number;

  @OneToMany(() => KnowledgeBaseChunk, (chunk) => chunk.document, {
    cascade: true,
  })
  chunks: KnowledgeBaseChunk[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
