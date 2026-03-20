import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Ruolo } from "../../common/enums/ruolo.enum";

@Entity("issue_categories")
@Index(["ruolo"])
export class IssueCategory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  nameIt: string;

  @Column({ type: "varchar", length: 100 })
  nameEn: string;

  @Column({ type: "enum", enum: Ruolo, enumName: "ruolo_enum" })
  ruolo: Ruolo;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
