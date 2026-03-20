import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

export type DocumentStatus =
  | "draft"
  | "reviewing"
  | "approved"
  | "verified"
  | "published"
  | "rejected";
export type UnionType = "fit-cisl" | "joint";
export type DocumentRuolo = "pilot" | "cabin_crew";

@Index(["ruolo", "status"])
@Index(["ruolo", "union"])
@Entity("documents")
export class Document {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ type: "text" })
  originalContent: string;

  @Column({ type: "text", nullable: true })
  aiReviewedContent: string | null;

  @Column({ type: "text", nullable: true })
  englishTranslation: string | null;

  @Column({ type: "text", nullable: true })
  englishTitle: string | null;

  @Column({ type: "text", nullable: true })
  finalPdfUrl: string;

  @Column({
    type: "enum",
    enum: [
      "draft",
      "reviewing",
      "approved",
      "verified",
      "published",
      "rejected",
    ],
    default: "draft",
  })
  status: DocumentStatus;

  @Column({ type: "text", nullable: true })
  rejectionReason: string | null;

  @Column({ type: "uuid" })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdBy" })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  publishedAt: Date;

  @Column({
    type: "enum",
    enum: ["fit-cisl", "joint"],
    default: "fit-cisl",
  })
  union: UnionType;

  @Column({
    type: "enum",
    enum: ["pilot", "cabin_crew"],
    default: "pilot",
  })
  ruolo: DocumentRuolo;
}
