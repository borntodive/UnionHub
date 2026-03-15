import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * CLA Contract Entity
 * Stores contractual data for RYR pilots and cabin crew by rank
 * Only SuperAdmin can manage these records
 */
@Entity('cla_contracts')
export class ClaContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, default: 'RYR' })
  company: string;

  @Column({ type: 'varchar', length: 10 }) // 'pil' or 'cc'
  role: string;

  @Column({ type: 'varchar', length: 10 }) // 'cpt', 'fo', 'tri', 'tre', 'ltc', etc.
  rank: string;

  // Basic salary (monthly, before 13th month division)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  basic: number;

  // FFP (Fixed Flight Pay) - monthly
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  ffp: number;

  // Standby Hourly rate
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  sbh: number;

  // Annual Leave daily rate
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  al: number;

  // Out of Base daily rate
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  oob: number;

  // Weekly Off rate (pilots only)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  woff: number;

  // Monthly allowance
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  allowance: number;

  // Per diem rate
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  diaria: number;

  // RSA (monthly)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 51.92 })
  rsa: number;

  // Training configuration (JSON for flexibility)
  @Column({ type: 'jsonb', nullable: true })
  trainingConfig: {
    allowance?: number;
    nonBtc?: {
      allowance: number;
      simDiaria: { min: number; max: number; pay: { ffp: number; sectorPay: number } }[];
      bonus?: { sectorEquivalent: number };
    };
    btc?: {
      allowance: number;
      simDiaria: { min: number; max: number; pay: { ffp: number; sectorPay: number } }[];
      bonus?: { sectorEquivalent: number };
    };
    bonus?: {
      pay: { min: number; max: number; pay: number }[];
      minSectors: number;
      sectorEquivalent?: number;
    };
  };

  // Effective year and month (when this contract version starts)
  @Column({ type: 'int', default: () => 'EXTRACT(YEAR FROM CURRENT_DATE)' })
  effectiveYear: number;

  @Column({ type: 'int', default: 1 })
  effectiveMonth: number; // 1-12

  // End year and month (when this contract version ends, null = current)
  @Column({ type: 'int', nullable: true })
  endYear: number | null;

  @Column({ type: 'int', nullable: true })
  endMonth: number | null; // 1-12

  // Is this the current active version?
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Metadata
  @VersionColumn()
  version: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;
}
