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
import { IssueCategory } from "../../issue-categories/entities/issue-category.entity";
import { IssueUrgency } from "../../issue-urgencies/entities/issue-urgency.entity";
import { Ruolo } from "../../common/enums/ruolo.enum";
import { IssueStatus } from "../../common/enums/issue-status.enum";

@Entity("issues")
@Index(["ruolo"])
@Index(["status"])
@Index(["userId"])
export class Issue {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "enum", enum: Ruolo, enumName: "ruolo_enum" })
  ruolo: Ruolo;

  @Column({
    type: "enum",
    enum: IssueStatus,
    enumName: "issue_status_enum",
    default: IssueStatus.OPEN,
  })
  status: IssueStatus;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { eager: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: Pick<User, "id" | "crewcode" | "nome" | "cognome">;

  @Column({ type: "uuid" })
  categoryId: string;

  @ManyToOne(() => IssueCategory, { eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "categoryId" })
  category: IssueCategory;

  @Column({ type: "uuid" })
  urgencyId: string;

  @ManyToOne(() => IssueUrgency, { eager: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "urgencyId" })
  urgency: IssueUrgency;

  @Column({ type: "text", nullable: true })
  adminNotes: string | null;

  @Column({ type: "timestamptz", nullable: true })
  solvedAt: Date | null;

  @Column({ type: "uuid", nullable: true })
  solvedById: string | null;

  @ManyToOne(() => User, { eager: false, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "solvedById" })
  solvedBy: Pick<User, "id" | "crewcode" | "nome" | "cognome"> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
