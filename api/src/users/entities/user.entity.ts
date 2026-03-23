import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from "typeorm";
import { UserRole } from "../../common/enums/user-role.enum";
import { Ruolo } from "../../common/enums/ruolo.enum";
import { Base } from "../../bases/entities/base.entity";
import { Contract } from "../../contracts/entities/contract.entity";
import { Grade } from "../../grades/entities/grade.entity";
import { UserStatusHistory } from "./user-status-history.entity";

export interface StatusLogEntry {
  isActive: boolean;
  timestamp: string;
  reason?: string;
  performedBy?: string;
}

@Entity("users")
@Index(["crewcode"], { unique: true })
@Index(["email"], { unique: true })
@Index(["role"])
@Index(["ruolo"])
@Index(["isActive"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Authentication fields
  @Column({ type: "varchar", length: 50, unique: true })
  crewcode: string;

  @Column({ type: "varchar", length: 255 })
  password: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: "boolean", default: true })
  mustChangePassword: boolean;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  // Professional data
  @Column({
    type: "enum",
    enum: Ruolo,
    enumName: "ruolo_enum",
    nullable: true,
  })
  ruolo: Ruolo | null;

  @Column({ type: "varchar", length: 100 })
  nome: string;

  @Column({ type: "varchar", length: 100 })
  cognome: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  telefono: string | null;

  // Relations
  @Column({ type: "uuid", nullable: true })
  baseId: string | null;

  @ManyToOne(() => Base, (base) => base.users, { nullable: true })
  @JoinColumn({ name: "baseId" })
  base: Base | null;

  @Column({ type: "uuid", nullable: true })
  contrattoId: string | null;

  @ManyToOne(() => Contract, (contract) => contract.users, { nullable: true })
  @JoinColumn({ name: "contrattoId" })
  contratto: Contract | null;

  @Column({ type: "uuid", nullable: true })
  gradeId: string | null;

  @ManyToOne(() => Grade, (grade) => grade.users, { nullable: true })
  @JoinColumn({ name: "gradeId" })
  grade: Grade | null;

  // Admin-only fields (sensitive)
  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({ type: "boolean", default: false })
  itud: boolean;

  @Column({ type: "boolean", default: false })
  rsa: boolean;

  // PDF Registration Form
  @Column({ type: "varchar", length: 500, nullable: true })
  registrationFormUrl: string | null;

  // Membership subscription date (from PDF signature date)
  @Column({ type: "date", nullable: true })
  dataIscrizione: Date | null;

  // Date when user entered the company
  @Column({ type: "date", nullable: true })
  dateOfEntry: Date | null;

  // Date when user became captain (CPT, LTC, LCC, TRI, TRE grades)
  @Column({ type: "date", nullable: true })
  dateOfCaptaincy: Date | null;

  // Timestamps
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  // Soft delete - when user is deactivated, this is set
  @Column({ type: "timestamptz", nullable: true })
  deactivatedAt: Date | null;

  // Quick status log for frontend display (summary of status changes)
  @Column({ type: "jsonb", nullable: true })
  statusLog: StatusLogEntry[] | null;

  // Status history (detailed audit trail in separate table)
  @OneToMany(() => UserStatusHistory, (history) => history.user)
  statusHistory: UserStatusHistory[];

  // Helper method to get full name
  get fullName(): string {
    return `${this.nome} ${this.cognome}`;
  }

  // Helper method to serialize user based on role (GDPR compliance)
  serialize(forRole: UserRole): Partial<User> {
    const base = {
      id: this.id,
      crewcode: this.crewcode,
      role: this.role,
      ruolo: this.ruolo,
      nome: this.nome,
      cognome: this.cognome,
      email: this.email,
      telefono: this.telefono,
      base: this.base,
      contratto: this.contratto,
      grade: this.grade,
      isActive: this.isActive,
      mustChangePassword: this.mustChangePassword,
      registrationFormUrl: this.registrationFormUrl,
      dataIscrizione: this.dataIscrizione,
      dateOfEntry: this.dateOfEntry,
      dateOfCaptaincy: this.dateOfCaptaincy,
      rsa: this.rsa,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    // Admin and SuperAdmin can see sensitive fields
    if (forRole === UserRole.ADMIN || forRole === UserRole.SUPERADMIN) {
      return {
        ...base,
        note: this.note,
        itud: this.itud,
        rsa: this.rsa,
        deactivatedAt: this.deactivatedAt,
        statusLog: this.statusLog,
      };
    }

    return base;
  }
}
