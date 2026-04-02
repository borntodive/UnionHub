// Payslip Calculator - TypeScript Types
// Based on PAYSLIP_CALCULATOR_EXPO_SPEC.md

// ============================================
// CORE INTERFACES
// ============================================

export interface PayslipItem {
  total: number;
  taxable: number;
  taxFree: number;
  isDeduction: boolean;
  quantity: number | null;
  unit: number | null;
  isSectorPay: boolean;
}

export interface LeaveItem {
  basicQuota: PayslipItem;
  ffpQuota: PayslipItem;
  total: PayslipItem;
}

export interface AdditionalItem {
  total: number;
  taxable: number;
  taxFree: number;
  isSLR: boolean; // Statutory Leave Refund
  isConguaglio: boolean; // Adjustment
}

export interface Payslip {
  basic: PayslipItem;
  basic13th: PayslipItem;
  ffp: PayslipItem; // Fixed Flight Pay
  flyDiaria: PayslipItem; // Flying per diem
  noFlyDiaria: PayslipItem; // Non-flying per diem
  ccTraining: PayslipItem; // Cabin crew training
  al: PayslipItem; // Annual leave
  woff: PayslipItem; // Working days off
  oob: PayslipItem; // Out of base nights
  rsa: PayslipItem; // Rep allowance
  oobUnplanned: PayslipItem; // Unplanned OOB
  ul: LeaveItem; // Unpaid leave
  simPay: PayslipItem; // Simulator pay
  trainingPay: PayslipItem; // Training bonus
  parentalLeave: LeaveItem;
  leave104: LeaveItem; // Law 104 leave
  sbh: PayslipItem; // Scheduled block hours
  itud: PayslipItem; // ITU days
  additionalPayments: AdditionalItem[];
  additionalDeductions: AdditionalItem[];
  union: PayslipItem;
  commissions: PayslipItem;
  bankHolydays: PayslipItem;
}

// ============================================
// TAX INTERFACES
// ============================================

export interface INPS {
  imponibile: number; // Taxable amount (raw, used for IRPEF derivation)
  imponibileArrotondato: number; // Rounded taxable amount (used for INPS contributions)
  contribuzione: {
    ivs: number;
    ivsAdd: number;
    fis: number;
    cigs: number;
    fsta: number;
  };
  contribuzioneTotale: number;
  pensionAcc: number;
  esenzioneIVS: {
    percentage: number;
    amount: number;
    concorreImponibileIRPEF: boolean;
  };
}

export interface IRPEF {
  imponibile: number;
  lordo: number; // Gross tax
  detrazioniLavoroDipendente: number;
  ritenute: number; // Net tax withheld
  aliquotaMedia: number; // Average tax rate
  trattamentoIntegrativo: number; // Bonus L. 21/2020
  taglioCuneoFiscale: {
    percentage: number;
    amount: number;
  };
  fondoPensione: {
    totale: number;
    volontaria: number;
    aziendale: number;
    fondAer: number; // FondAer mandatory aviation-sector contribution (1% of RUT)
  };
  addizionaliComunali: number;
  accontoAddizionaliComunali: number;
  addizionaliRegionali: number;
  detrazioneConiuge: number;
  retribuzioneUtileTFR: number;
  tfr: number;
}

// ============================================
// RESULT INTERFACE
// ============================================

export interface Payroll {
  payslipItems: Payslip;
  sectorPay: PayslipItem;
  taxArea: number;
  taxFreeArea: number;
  grossPay: number;
  areaINPS: INPS;
  areaIRPEF: IRPEF;
  netPayment: number;
  totaleCompetenze: number; // Total earnings
  totaleTrattenute: number; // Total deductions
}

// ============================================
// INPUT INTERFACES
// ============================================

export interface PayslipInput {
  date: string; // ISO date (reference month)
  sbh: string; // Scheduled block hours (format: "HH:MM")
  flyDiaria: number;
  noFlyDiaria: number;
  onlyNationalFly: number;
  al: number; // Annual leave days
  woff: number; // Working days off
  oob: number; // Out of base nights
  ul: number; // Unpaid leave days
  additional: AdditionalInput[];
  additionalDeductions: AdditionalDeductionInput[];
  parentalDays: number;
  days104: number; // Law 104 leave days
  trainingSectors: number;
  simDays: number;
  itud: number;
  oobUnplanned: number;
  ccTrainingDays: number;
  pregressoIrpef: number; // Previous IRPEF balance
  commissions: number;
  landingInOffDay: number;
  bankHolydays: number;
  inpsDays: number;
}

export interface AdditionalInput {
  amount: number;
  tax: number; // 0, 50, 100, or 999 (conguaglio)
  isSLR: boolean;
  isConguaglio: boolean;
}

export interface AdditionalDeductionInput {
  amount: number;
  tax: number;
  isConguaglio: boolean;
}

// ============================================
// SETTINGS INTERFACE
// ============================================

export interface LegacyCustom {
  ffp: number; // FFP monthly base (before part-time/CU reductions)
  sbh: number; // SBH per-hour rate
  al: number; // Annual leave per-day rate
}

export interface PayslipSettings {
  company: string; // e.g., 'RYR'
  role: string; // 'pil' | 'cc'
  rank: string; // e.g., 'cpt', 'fo', 'sepe'
  base: string; // e.g., 'BGY', 'FCO'
  union: number; // Union fee
  parttime: boolean;
  parttimePercentage: number; // 0.5, 0.66, 0.75
  coniugeCarico: boolean; // Spouse dependent
  prevMonthLeavePayment: boolean;
  tfrContribution: number;
  addComunali: number; // Municipal taxes
  accontoAddComunali: number;
  addRegionali: number; // Regional taxes
  legacy: boolean;
  legacyCustom: LegacyCustom; // Values entered by user (displayed in UI)
  legacyDeltas: LegacyCustom; // Deltas from contract (used in general-settings calc)
  legacyDirect?: boolean; // Runtime only: true = use legacyCustom directly (override mode)
  triAndLtc: boolean; // TRI acting as LTC
  btc: boolean; // BTC-based contract
  cu: boolean; // New captain
  voluntaryPensionContribution: number;
}

// ============================================
// CONTRACT DATA INTERFACES
// ============================================

export interface CompanyConfig {
  maxContributoAziendaleTfr: number;
  fondAerRate: number; // FondAer mandatory employee pension rate (aviation CCNL)
  cuReduction: number;
  unpayedLeaveDays: {
    pil: number;
    cc: number;
  };
  inpsDays: number;
  unionFees: {
    cpt: number;
    fo: number;
    cc: number;
  };
}

export interface SeniorityBracket {
  minYears: number;
  maxYears: number | null;
  basic?: number;
  ffp?: number;
  sbh?: number;
  al?: number;
  oob?: number;
  diaria?: number;
  rsa?: number;
  itud?: number;
  allowance?: number;
  woff?: number;
}

export interface UserContext {
  itud?: boolean;
  rsa?: boolean;
  dateOfEntry?: string | null;
  dateOfCaptaincy?: string | null;
  gradeCode?: string;
  /** Pre-fetched seniority brackets from live API */
  seniorityBrackets?: SeniorityBracket[];
  /** Pre-fetched contract data from DB/cache */
  liveContractData?: any;
  /** Pre-fetched LTC contract data (used for TRE/triAndLtc training allowance) */
  ltcContractData?: any;
}

export interface RankContract {
  basic: number; // Monthly base
  ffp: number; // Monthly FFP
  sbh: number; // Per hour rate
  al: number; // Per day rate
  oob: number; // Per night rate
  woff: number; // Per day rate
  allowance: number; // Monthly allowance
  diaria: number; // Per day rate
  training: TrainingConfig | null;
  rsa: number; // Monthly
  itud: number; // Daily rate for injury days
  basicDays?: number; // Days for basic calculation
  maxContributoAziendaleTfr?: number; // Max company TFR contribution
  seniorityBrackets?: SeniorityBracket[];
}

export interface TrainingConfig {
  allowance?: number;
  simDiaria?: SimDiariaTier[];
  nonBtc?: {
    allowance: number;
    simDiaria: SimDiariaTier[];
    bonus?: {
      sectorEquivalent: number;
    };
  };
  btc?: {
    allowance: number;
    bonus?: {
      sectorEquivalent: number;
    };
    simDiaria: SimDiariaTier[];
  };
  bonus?: {
    sectorEquivalent?: number;
    pay?: TieredPay[];
    minSectors?: number;
  };
}

export interface SimDiariaTier {
  min: number;
  max: number;
  pay: {
    ffp: number;
    sectorPay: number;
  };
}

export interface TieredPay {
  min: number;
  max: number;
  pay: number;
}

// ============================================
// STORE INTERFACES
// ============================================

export interface SavedCalculation {
  id: string;
  name: string;
  date: string;
  input: PayslipInput;
  settings: PayslipSettings;
  result: Payroll;
  createdAt: string;
}

export interface PayslipState {
  input: PayslipInput;
  settings: PayslipSettings;
  result: Payroll | null;
  history: SavedCalculation[];
  isCalculating: boolean;
  error: string | null;
}
