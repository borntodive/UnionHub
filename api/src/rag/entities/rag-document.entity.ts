import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DocumentVisibility } from "../../common/enums/document-visibility.enum";
import { DocumentVersion } from "./document-version.entity";
import { Chunk } from "./chunk.entity";
import { IngestionJob } from "./ingestion-job.entity";

@Entity("rag_documents")
@Index(["code"], { unique: true })
@Index(["isActive"])
@Index(["visibility"])
export class RagDocument {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50, unique: true })
  code: string;

  @Column({ type: "varchar", length: 300 })
  title: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  manualPart: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  issue: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  revision: string | null;

  @Column({ type: "date", nullable: true })
  revisionDate: Date | null;

  @Column({ type: "varchar", length: 300 })
  sourceFileName: string;

  @Column({ type: "varchar", length: 500 })
  filePath: string;

  @Column({ type: "char", length: 64 })
  sha256: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({
    type: "enum",
    enum: DocumentVisibility,
    default: DocumentVisibility.PUBLIC,
  })
  visibility: DocumentVisibility;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @OneToMany(() => DocumentVersion, (v) => v.document)
  versions: DocumentVersion[];

  @OneToMany(() => Chunk, (c) => c.document)
  chunks: Chunk[];

  @OneToMany(() => IngestionJob, (j) => j.document)
  ingestionJobs: IngestionJob[];
}
