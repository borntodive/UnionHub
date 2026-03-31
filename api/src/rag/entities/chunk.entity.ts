import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RagDocument } from "./rag-document.entity";
import { DocumentVersion } from "./document-version.entity";
import { ChunkType } from "../enums/chunk-type.enum";
import { ChunkEmbedding } from "./chunk-embedding.entity";

@Entity("chunks")
@Index(["documentId"])
@Index(["versionId"])
export class Chunk {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  documentId: string;

  @ManyToOne(() => RagDocument, (d) => d.chunks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "documentId" })
  document: RagDocument;

  @Column({ type: "uuid", nullable: true })
  versionId: string | null;

  @ManyToOne(() => DocumentVersion, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "versionId" })
  version: DocumentVersion | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  sectionCode: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  sectionTitle: string | null;

  @Column({ type: "int", nullable: true })
  pageStart: number | null;

  @Column({ type: "int", nullable: true })
  pageEnd: number | null;

  @Column({
    type: "enum",
    enum: ChunkType,
    enumName: "chunk_type_enum",
    default: ChunkType.TEXT,
  })
  chunkType: ChunkType;

  @Column({ type: "int", default: 0 })
  chunkIndex: number;

  @Column({ type: "text" })
  textContent: string;

  @Column({ type: "jsonb", nullable: true })
  tableJson: object | null;

  @Column({ type: "jsonb", default: {} })
  metadata: object;

  @Column({ type: "int", nullable: true })
  tokenCount: number | null;

  // "searchVector" is a GENERATED STORED column — TypeORM must never write to it.
  // It is accessed only via raw SQL in SearchService.

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @OneToOne(() => ChunkEmbedding, (e) => e.chunk)
  embedding: ChunkEmbedding;
}
