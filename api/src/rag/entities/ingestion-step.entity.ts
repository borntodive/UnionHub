import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { IngestionJob } from "./ingestion-job.entity";
import { IngestionStatus } from "../enums/ingestion-status.enum";

@Entity("ingestion_steps")
@Index(["jobId"])
export class IngestionStep {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  jobId: string;

  @ManyToOne(() => IngestionJob, (j) => j.steps, { onDelete: "CASCADE" })
  @JoinColumn({ name: "jobId" })
  job: IngestionJob;

  @Column({ type: "varchar", length: 100 })
  stepName: string;

  @Column({
    type: "enum",
    enum: IngestionStatus,
    enumName: "ingestion_status_enum",
    default: IngestionStatus.PENDING,
  })
  status: IngestionStatus;

  @Column({ type: "jsonb", default: {} })
  payload: object;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "int", nullable: true })
  progressCurrent: number | null;

  @Column({ type: "int", nullable: true })
  progressTotal: number | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
