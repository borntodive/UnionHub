import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ChatMessage } from "./chat-message.entity";
import { User } from "../../users/entities/user.entity";

@Entity("chat_reactions")
@Index(["messageId", "userId", "emoji"], { unique: true })
export class ChatReaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  messageId: string;

  @ManyToOne(() => ChatMessage, (m) => m.reactions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "messageId" })
  message: ChatMessage;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 8 })
  emoji: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
