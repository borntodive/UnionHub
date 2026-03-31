import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("query_logs")
@Index(["createdAt"])
export class QueryLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  question: string;

  @Column({ type: "text", nullable: true })
  rewrittenQuestion: string | null;

  @Column({ type: "varchar", length: 20, default: "hybrid" })
  retrievalMode: string;

  @Column({ type: "jsonb", default: [] })
  documentIds: string[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
