import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("chat_read_receipts")
@Index(["userId", "roomId"], { unique: true })
export class ChatReadReceipt {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", length: 100 })
  roomId: string;

  @Column({ type: "timestamptz" })
  lastReadAt: Date;
}
