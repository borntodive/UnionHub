import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("issue_urgencies")
export class IssueUrgency {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  nameIt: string;

  @Column({ type: "varchar", length: 100 })
  nameEn: string;

  @Column({ type: "int" })
  level: number;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
