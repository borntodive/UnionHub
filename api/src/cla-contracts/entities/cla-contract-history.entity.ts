import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

/**
 * CLA Contract History Entity
 * Audit trail for all contract modifications
 * Immutable records - only inserts, no updates/deletes
 */
@Entity("cla_contract_history")
export class ClaContractHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Reference to the contract (can be null if record was deleted)
  @Column({ type: "uuid", nullable: true })
  @Index()
  contractId: string | null;

  // Action type
  @Column({ type: "varchar", length: 20 }) // 'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'
  action: string;

  // Who performed the action
  @Column({ type: "uuid" })
  performedBy: string;

  @Column({ type: "varchar", length: 20 })
  performerCrewcode: string;

  // Snapshot of the data at the time of action
  @Column({ type: "jsonb" })
  dataSnapshot: {
    company: string;
    role: string;
    rank: string;
    basic: number;
    ffp: number;
    sbh: number;
    al: number;
    oob: number;
    woff: number;
    allowance: number;
    diaria: number;
    rsa: number;
    trainingConfig?: any;
    effectiveYear: number;
    isActive: boolean;
    version: number;
  };

  // Change summary (for quick viewing)
  @Column({ type: "jsonb", nullable: true })
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
