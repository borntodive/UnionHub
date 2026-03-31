import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RagDocument } from "./rag-document.entity";

@Entity("document_versions")
@Index(["documentId"])
@Index(["documentId", "isCurrent"])
export class DocumentVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  documentId: string;

  @ManyToOne(() => RagDocument, (d) => d.versions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "documentId" })
  document: RagDocument;

  @Column({ type: "varchar", length: 50 })
  versionLabel: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  issue: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  revision: string | null;

  @Column({ type: "date", nullable: true })
  revisionDate: Date | null;

  @Column({ type: "boolean", default: false })
  isCurrent: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
