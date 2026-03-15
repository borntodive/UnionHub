// CLA Contracts Seed - April 2025 to March 2026
// Values WITHOUT corrections (pre-April 2026)

import { DataSource } from 'typeorm';
import { ClaContract } from '../../cla-contracts/entities/cla-contract.entity';

const CONTRACTS_2025 = [
  // ========== PILOTS - Line Crew ==========
  {
    company: 'RYR',
    role: 'pil',
    rank: 'cpt',
    basic: Math.round((15000 / 13) * 100) / 100,
    ffp: Math.round((82044 / 12) * 100) / 100,  // Pre-correction: 82044
    sbh: Math.round((35870 / 850) * 10000) / 10000,
    al: Math.round((4785 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: Math.round((8000 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'fo',
    basic: Math.round((5000 / 13) * 100) / 100,
    ffp: Math.round((39732 / 12) * 100) / 100,  // Pre-correction: 39732
    sbh: Math.round((15479 / 850) * 10000) / 10000,
    al: Math.round((3828 / 29) * 100) / 100,
    oob: 155,
    woff: 450,
    allowance: Math.round((7500 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'jfo',
    basic: Math.round((5000 / 13) * 100) / 100,
    ffp: Math.round((35432 / 12) * 100) / 100,  // No correction
    sbh: Math.round((13566 / 850) * 10000) / 10000,
    al: Math.round((3828 / 29) * 100) / 100,
    oob: 155,
    woff: 450,
    allowance: Math.round((7500 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'so',
    basic: Math.round((5000 / 13) * 100) / 100,
    ffp: Math.round((14698 / 12) * 100) / 100,  // No correction
    sbh: Math.round((15640 / 850) * 10000) / 10000,
    al: Math.round((225 / 29) * 100) / 100,
    oob: 155,
    woff: 138,
    allowance: Math.round((7500 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  // ========== PILOTS - Instructors (NO BTC) ==========
  {
    company: 'RYR',
    role: 'pil',
    rank: 'tre',
    basic: Math.round((15000 / 13) * 100) / 100,
    ffp: Math.round((82044 / 12) * 100) / 100,  // Same as CPT pre-correction
    sbh: Math.round((35870 / 850) * 10000) / 10000,
    al: Math.round((4785 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: Math.round((8000 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: {
      nonBtc: {
        allowance: Math.round((6500 / 12) * 100) / 100,
        simDiaria: [{ min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } }],
        bonus: { sectorEquivalent: 3 },
      },
    },
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'tri',
    basic: Math.round((15000 / 13) * 100) / 100,
    ffp: Math.round((82044 / 12) * 100) / 100,  // Same as CPT pre-correction
    sbh: Math.round((35870 / 850) * 10000) / 10000,
    al: Math.round((4785 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: Math.round((8000 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: {
      nonBtc: {
        allowance: Math.round((6079 / 12) * 100) / 100,
        simDiaria: [{ min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } }],
        bonus: { sectorEquivalent: 3 },
      },
    },
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'ltc',
    basic: Math.round((15000 / 13) * 100) / 100,
    ffp: Math.round((82044 / 12) * 100) / 100,  // Same as CPT pre-correction
    sbh: Math.round((35870 / 850) * 10000) / 10000,
    al: Math.round((4785 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: Math.round((8000 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: {
      allowance: Math.round((14000 / 12) * 100) / 100,
      bonus: {
        pay: [
          { min: 0, max: 21, pay: 0 },
          { min: 22, max: 29, pay: 40 },
          { min: 30, max: 50, pay: 60 },
        ],
        minSectors: 21,
      },
    },
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'lcc',
    basic: Math.round((15000 / 13) * 100) / 100,
    ffp: Math.round((82044 / 12) * 100) / 100,  // Same as CPT pre-correction
    sbh: Math.round((35870 / 850) * 10000) / 10000,
    al: Math.round((4785 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: Math.round((8000 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: {
      allowance: Math.round((5000 / 12) * 100) / 100,
    },
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'sfi',
    basic: Math.round((5000 / 13) * 100) / 100,
    ffp: Math.round((39732 / 12) * 100) / 100,  // Same as FO pre-correction
    sbh: Math.round((15479 / 850) * 10000) / 10000,
    al: Math.round((3828 / 29) * 100) / 100,
    oob: 155,
    woff: 450,
    allowance: Math.round((7500 / 12) * 100) / 100,
    diaria: Math.round((8831 / 190) * 10000) / 10000,
    rsa: 51.92,
    trainingConfig: {
      nonBtc: {
        allowance: Math.round((6000 / 12) * 100) / 100,
        simDiaria: [{ min: 1, max: 999, pay: { ffp: 0, sectorPay: 100.5 } }],
      },
      btc: {
        allowance: Math.round((6000 / 12) * 100) / 100,
        simDiaria: [
          { min: 1, max: 10, pay: { ffp: 93.75, sectorPay: 61.65 } },
          { min: 11, max: 999, pay: { ffp: 0, sectorPay: 123.3 } },
        ],
      },
    },
    effectiveYear: 2025,
    effectiveMonth: 4,
    endYear: 2026,
    endMonth: 3,
    isActive: true,
  },
];

export async function seedClaContracts2025(dataSource: DataSource, adminUserId: string): Promise<void> {
  const repository = dataSource.getRepository(ClaContract);

  console.log('Seeding CLA Contracts 2025 (Apr 2025 - Mar 2026)...');

  for (const contractData of CONTRACTS_2025) {
    const contract = repository.create({
      ...contractData,
      trainingConfig: contractData.trainingConfig || undefined,
      createdBy: adminUserId,
      version: 1,
    } as any);
    await repository.save(contract);
    console.log(`  Created ${contractData.rank} contract for 2025`);
  }

  console.log(`Seeded ${CONTRACTS_2025.length} CLA Contracts for 2025`);
}
