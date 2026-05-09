import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../../users/entities/user.entity";

export interface ChatRequestCitation {
  document_title: string;
  section: string;
}

@Entity("chat_requests")
@Index(["userId"])
@Index(["createdAt"])
export class ChatRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { eager: false, onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "userId" })
  user: Pick<User, "id" | "crewcode" | "nome" | "cognome"> | null;

  @Column({ type: "text" })
  question: string;

  @Column({ type: "text" })
  answer: string;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  citations: ChatRequestCitation[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
