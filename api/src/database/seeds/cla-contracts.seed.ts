import { DataSource } from 'typeorm';
import { ClaContract } from '../../cla-contracts/entities/cla-contract.entity';

// Initial contract data based on RYR_CONFIG from the app
const INITIAL_CONTRACTS = [
  // Pilots - CPT
  {
    company: 'RYR',
    role: 'pil',
    rank: 'cpt',
    basic: 15000 / 13,
    ffp: (79044 + 3000) / 12,  // +€3.000 from April 2026 correction
    sbh: 35870 / 850,
    al: 4785 / 29,
    oob: 160,
    woff: 900,
    allowance: 8000 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 1,
    endYear: 2026,
    endMonth: 3,  // Ends March 2026, new correction starts April
    isActive: true,
  },
  // Pilots - FO
  {
    company: 'RYR',
    role: 'pil',
    rank: 'fo',
    basic: 5000 / 13,
    ffp: (38132 + 1600) / 12,  // +€1.600 from April 2026 correction
    sbh: 15479 / 850,
    al: 3828 / 29,
    oob: 155,
    woff: 450,
    allowance: 7500 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    isActive: true,
  },
  // Pilots - SFI
  {
    company: 'RYR',
    role: 'pil',
    rank: 'sfi',
    basic: 5000 / 13,
    ffp: (38132 + 1600) / 12,  // +€1.600 from April 2026 correction (SFI gets FO rate)
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
    isActive: true,
  },
  // Pilots - TRI
  {
    company: 'RYR',
    role: 'pil',
    rank: 'tri',
    basic: 15000 / 13,
    ffp: (79044 + 3000) / 12,  // Same as CPT (+€3.000 from April 2026)
    sbh: 35870 / 850,
    al: 4785 / 29,
    oob: 160,
    woff: 900,
    allowance: 8000 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: {
      nonBtc: {
        allowance: 5079 / 12,
        simDiaria: [{ min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } }],
        bonus: { sectorEquivalent: 3 },
      },
      btc: {
        allowance: 5079 / 12,
        simDiaria: [
          { min: 1, max: 10, pay: { ffp: 150, sectorPay: 108.83 } },
          { min: 11, max: 999, pay: { ffp: 0, sectorPay: 217.65 } },
        ],
        bonus: { sectorEquivalent: 3 },
      },
    },
    effectiveYear: 2026,
    isActive: true,
  },
  // Pilots - TRE
  {
    company: 'RYR',
    role: 'pil',
    rank: 'tre',
    basic: 15000 / 13,
    ffp: (79044 + 3000) / 12,  // Same as CPT (+€3.000 from April 2026)
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
      btc: {
        allowance: 7079 / 12,
        simDiaria: [
          { min: 1, max: 10, pay: { ffp: 150, sectorPay: 108.83 } },
          { min: 11, max: 999, pay: { ffp: 0, sectorPay: 217.65 } },
        ],
        bonus: { sectorEquivalent: 3 },
      },
    },
    effectiveYear: 2026,
    isActive: true,
  },
  // Pilots - LTC
  {
    company: 'RYR',
    role: 'pil',
    rank: 'ltc',
    basic: 15000 / 13,
    ffp: (79044 + 3000) / 12,  // Same as CPT (+€3.000 from April 2026)
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
    isActive: true,
  },
  // Pilots - LCC
  {
    company: 'RYR',
    role: 'pil',
    rank: 'lcc',
    basic: 15000 / 13,
    ffp: (79044 + 3000) / 12,  // Same as CPT (+€3.000 from April 2026)
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
    isActive: true,
  },
  // Pilots - JFO
  {
    company: 'RYR',
    role: 'pil',
    rank: 'jfo',
    basic: 5000 / 13,
    ffp: 35432 / 12,
    sbh: 13566 / 850,
    al: 3828 / 29,
    oob: 155,
    woff: 450,
    allowance: 7500 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    isActive: true,
  },
  // Pilots - SO
  {
    company: 'RYR',
    role: 'pil',
    rank: 'so',
    basic: 5000 / 13,
    ffp: 14698 / 12,
    sbh: 15640 / 850,
    al: 225 / 29,
    oob: 155,
    woff: 138,
    allowance: 7500 / 12,
    diaria: 8831 / 190,
    rsa: 51.92,
    trainingConfig: null,
    effectiveYear: 2026,
    isActive: true,
  },
  // Cabin Crew - SEPE
  {
    company: 'RYR',
    role: 'cc',
    rank: 'sepe',
    basic: 5000 / 13,
    ffp: 13262.76 / 12,
    sbh: 6.88,
    al: 41.29,
    oob: 28,
    woff: 0,
    allowance: (730 + 2500) / 12,
    diaria: 72.29,
    rsa: 51.92,
    trainingConfig: {
      allowance: 2905 / 12,
      simDiaria: [],
    },
    effectiveYear: 2026,
    isActive: true,
  },
  // Cabin Crew - SEPI
  {
    company: 'RYR',
    role: 'cc',
    rank: 'sepi',
    basic: 5000 / 13,
    ffp: 13262.76 / 12,
    sbh: 6.88,
    al: 41.29,
    oob: 28,
    woff: 0,
    allowance: (730 + 2500) / 12,
    diaria: 72.29,
    rsa: 52.92,
    trainingConfig: {
      allowance: 1905 / 12,
      simDiaria: [],
    },
    effectiveYear: 2026,
    isActive: true,
  },
  // Cabin Crew - PU
  {
    company: 'RYR',
    role: 'cc',
    rank: 'pu',
    basic: 5000 / 13,
    ffp: 938.5 + (750 / 12),  // +€750/year from April 2026 correction
    sbh: 6.88,
    al: 41.29,
    oob: 28,
    woff: 0,
    allowance: 60.84 + 208.34,
    diaria: 40,
    rsa: 52.92,
    trainingConfig: null,
    effectiveYear: 2026,
    isActive: true,
  },
  // Cabin Crew - JPU
  {
    company: 'RYR',
    role: 'cc',
    rank: 'jpu',
    basic: 307.69,
    ffp: 676.07 + (750 / 12),  // +€750/year from April 2026 correction
    sbh: 5.7,
    al: 35.03,
    oob: 28,
    woff: 0,
    allowance: 60.84,
    diaria: 40,
    rsa: 52.92,
    trainingConfig: null,
    effectiveYear: 2026,
    isActive: true,
  },
  // Cabin Crew - JU
  {
    company: 'RYR',
    role: 'cc',
    rank: 'ju',
    basic: 230.77,
    ffp: 567.98 + (500 / 12),  // +€500/year from April 2026 correction
    sbh: 4.69,
    al: 29.06,
    oob: 28,
    woff: 0,
    allowance: 60.84,
    diaria: 40,
    rsa: 52.92,
    trainingConfig: null,
    effectiveYear: 2026,
    isActive: true,
  },
];

export async function seedClaContracts(dataSource: DataSource, adminUserId: string): Promise<void> {
  const repository = dataSource.getRepository(ClaContract);

  // Check if contracts already exist
  const count = await repository.count();
  if (count > 0) {
    console.log('CLA Contracts already seeded, skipping...');
    return;
  }

  console.log('Seeding CLA Contracts...');

  for (const contractData of INITIAL_CONTRACTS) {
    const contract = repository.create({
      ...contractData,
      trainingConfig: contractData.trainingConfig || undefined,
      createdBy: adminUserId,
      version: 1,
    } as any);
    await repository.save(contract);
  }

  console.log(`Seeded ${INITIAL_CONTRACTS.length} CLA Contracts`);
}
