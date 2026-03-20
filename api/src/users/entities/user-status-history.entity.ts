import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum StatusChangeType {
  ACTIVATION = "activation",
  DEACTIVATION = "deactivation",
  REACTIVATION = "reactivation",
}

@Entity("user_status_history")
export class UserStatusHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, (user) => user.statusHistory, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({
    type: "enum",
    enum: StatusChangeType,
  })
  changeType: StatusChangeType;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason: string | null;

  @Column({ type: "uuid", nullable: true })
  changedById: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
