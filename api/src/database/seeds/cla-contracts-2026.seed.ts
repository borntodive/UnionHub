// CLA Contracts Seed - April 2026 to March 2027
// Values WITH corrections applied (post-April 2026)

import { DataSource } from 'typeorm';
import { ClaContract } from '../../cla-contracts/entities/cla-contract.entity';

const CONTRACTS_2026 = [
  // ========== PILOTS - Line Crew ==========
  {
    company: 'RYR',
    role: 'pil',
    rank: 'cpt',
    basic: 15000 / 13,
    ffp: 85044 / 12,  // WITH correction: 82044 + 3000
    sbh: 35870 / 850,
    al: 4785 / 29,
    oob: 160,
    woff: 900,
    allowance: 8000 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'fo',
    basic: 5000 / 13,
    ffp: 41332 / 12,  // WITH correction: 39732 + 1600
    sbh: 15479 / 850,
    al: 3828 / 29,
    oob: 155,
    woff: 450,
    allowance: 7500 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'jfo',
    basic: 5000 / 13,
    ffp: 35432 / 12,  // No correction
    sbh: 13566 / 850,
    al: 3828 / 29,
    oob: 155,
    woff: 450,
    allowance: 7500 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'so',
    basic: 5000 / 13,
    ffp: 14698 / 12,  // No correction
    sbh: 15640 / 850,
    al: 225 / 29,
    oob: 155,
    woff: 138,
    allowance: 7500 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  // ========== PILOTS - Instructors (NO BTC) ==========
  {
    company: 'RYR',
    role: 'pil',
    rank: 'tre',
    basic: 15000 / 13,
    ffp: 85044 / 12,  // WITH correction (same as CPT)
    sbh: 35870 / 850,
    al: 4785 / 29,
    oob: 160,
    woff: 900,
    allowance: 8000 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: {
      nonBtc: {
        allowance: 6500 / 12,
        simDiaria: [{ min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } }],
        bonus: { sectorEquivalent: 3 },
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'tri',
    basic: 15000 / 13,
    ffp: 85044 / 12,  // WITH correction (same as CPT)
    sbh: 35870 / 850,
    al: 4785 / 29,
    oob: 160,
    woff: 900,
    allowance: 8000 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: {
      nonBtc: {
        allowance: 6079 / 12,
        simDiaria: [{ min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } }],
        bonus: { sectorEquivalent: 3 },
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'ltc',
    basic: 15000 / 13,
    ffp: 85044 / 12,  // WITH correction (same as CPT)
    sbh: 35870 / 850,
    al: 4785 / 29,
    oob: 160,
    woff: 900,
    allowance: 8000 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: {
      allowance: 14000 / 12,
      bonus: {
        pay: [
          { min: 0, max: 21, pay: 0 },
          { min: 22, max: 29, pay: 40 },
          { min: 30, max: 50, pay: 60 },
        ],
        minSectors: 21,
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'lcc',
    basic: 15000 / 13,
    ffp: 85044 / 12,  // WITH correction (same as CPT)
    sbh: 35870 / 850,
    al: 4785 / 29,
    oob: 160,
    woff: 900,
    allowance: 8000 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: {
      allowance: 5000 / 12,
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: 'RYR',
    role: 'pil',
    rank: 'sfi',
    basic: 5000 / 13,
    ffp: 41332 / 12,  // WITH correction (same as FO)
    sbh: 15479 / 850,
    al: 3828 / 29,
    oob: 155,
    woff: 450,
    allowance: 7500 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: {
      nonBtc: {
        allowance: 6000 / 12,
        simDiaria: [{ min: 1, max: 999, pay: { ffp: 0, sectorPay: 100.5 } }],
      },
      btc: {
        allowance: 6000 / 12,
        simDiaria: [
          { min: 1, max: 10, pay: { ffp: 93.75, sectorPay: 61.65 } },
          { min: 11, max: 999, pay: { ffp: 0, sectorPay: 123.3 } },
        ],
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
];

export async function seedClaContracts2026(dataSource: DataSource, adminUserId: string): Promise<void> {
  const repository = dataSource.getRepository(ClaContract);

  console.log('Seeding CLA Contracts 2026 (Apr 2026 - Mar 2027)...');

  for (const contractData of CONTRACTS_2026) {
    const contract = repository.create({
      ...contractData,
      trainingConfig: contractData.trainingConfig || undefined,
      createdBy: adminUserId,
      version: 1,
    } as any);
    await repository.save(contract);
    console.log(`  Created ${contractData.rank} contract for 2026`);
  }

  console.log(`Seeded ${CONTRACTS_2026.length} CLA Contracts for 2026`);
}
