import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ChatAttachment } from "./chat-attachment.entity";

@Entity("chat_messages")
@Index(["roomId", "createdAt"])
export class ChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  roomId: string;

  @Column({ type: "uuid" })
  senderId: string;

  @ManyToOne(() => User, { eager: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "senderId" })
  sender: User;

  @Column({ type: "text", nullable: true })
  content: string | null;

  @Column({ type: "boolean", default: false })
  isPinned: boolean;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @OneToMany(() => ChatAttachment, (a) => a.message, {
    eager: false,
    cascade: true,
  })
  attachments: ChatAttachment[];
}
