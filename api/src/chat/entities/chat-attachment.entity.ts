import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ChatMessage } from "./chat-message.entity";

@Entity("chat_attachments")
export class ChatAttachment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: true })
  messageId: string | null;

  @ManyToOne(() => ChatMessage, (m) => m.attachments, {
    onDelete: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "messageId" })
  message: ChatMessage;

  @Column({ type: "varchar", length: 255 })
  originalName: string;

  @Column({ type: "varchar", length: 255 })
  filename: string;

  @Column({ type: "varchar", length: 100 })
  mimeType: string;

  @Column({ type: "integer" })
  size: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
