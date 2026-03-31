import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RagDocument } from "./rag-document.entity";
import { IngestionStatus } from "../enums/ingestion-status.enum";
import { IngestionStep } from "./ingestion-step.entity";

@Entity("ingestion_jobs")
@Index(["documentId"])
@Index(["status"])
export class IngestionJob {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  documentId: string;

  @ManyToOne(() => RagDocument, (d) => d.ingestionJobs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "documentId" })
  document: RagDocument;

  @Column({
    type: "enum",
    enum: IngestionStatus,
    enumName: "ingestion_status_enum",
    default: IngestionStatus.PENDING,
  })
  status: IngestionStatus;

  @Column({ type: "timestamptz", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  finishedAt: Date | null;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @OneToMany(() => IngestionStep, (s) => s.job)
  steps: IngestionStep[];
}
