import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Issue } from "./issue.entity";

@Entity("issue_attachments")
export class IssueAttachment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  issueId: string;

  @ManyToOne(() => Issue, (i) => i.attachments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue: Issue;

  @Column({ type: "varchar", length: 500 })
  filename: string;

  @Column({ type: "varchar", length: 500 })
  originalName: string;

  @Column({ type: "varchar", length: 100 })
  mimeType: string;

  @Column({ type: "int" })
  size: number;

  @Column({ type: "varchar", length: 1000 })
  url: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
