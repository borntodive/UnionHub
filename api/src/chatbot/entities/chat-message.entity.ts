import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

export type ChatRole = "user" | "assistant";

@Entity("chat_messages")
@Index(["userId", "conversationId", "createdAt"])
export class ChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  /** Client-generated UUID that identifies a conversation session */
  @Column({ name: "conversation_id", type: "uuid" })
  conversationId: string;

  @Column({ type: "varchar" })
  role: ChatRole;

  @Column({ type: "text" })
  content: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
