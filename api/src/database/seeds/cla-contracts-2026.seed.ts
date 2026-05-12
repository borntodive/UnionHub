// CLA Contracts Seed - April 2026 to March 2027
// Values WITH corrections applied (post-April 2026)

import { DataSource } from "typeorm";
import { ClaContract } from "../../cla-contracts/entities/cla-contract.entity";

const CONTRACTS_2026 = [
  {
    company: "RYR",
    role: "pil",
    rank: "cpt",
    basic: Math.round((21450 / 13) * 100) / 100,
    ffp: Math.round((93800 / 12) * 100) / 100, // Pre-correction: 82044
    sbh: Math.round((39993 / 850) * 100) / 100,
    al: Math.round((5458 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "fo",
    basic: Math.round((10075 / 13) * 100) / 100,
    ffp: Math.round((47803 / 12) * 100) / 100, // Pre-correction: 39732
    sbh: Math.round((12833 / 850) * 100) / 100,
    al: Math.round((3828 / 29) * 100) / 100,
    oob: 155,
    woff: 450,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 150,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "jfo",
    basic: Math.round((9000 / 13) * 100) / 100,
    ffp: Math.round((43501 / 12) * 100) / 100, // No correction
    sbh: Math.round((15997 / 850) * 10000) / 10000,
    al: Math.round((3828 / 29) * 100) / 100,
    oob: 155,
    woff: 450,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "so",
    basic: Math.round((5000 / 13) * 100) / 100,
    ffp: Math.round((26720 / 12) * 100) / 100, // No correction
    sbh: Math.round((15640 / 850) * 10000) / 10000,
    al: Math.round((2137 / 29) * 100) / 100,
    oob: 155,
    woff: 225,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: null,
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "tre",
    basic: Math.round((21450 / 13) * 100) / 100,
    ffp: Math.round((93800 / 12) * 100) / 100, // Same as CPT pre-correction
    sbh: Math.round((35852 / 762) * 100) / 100,
    al: Math.round((5458 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: {
      nonBtc: {
        allowance: Math.round((7000 / 12) * 100) / 100,
        simDiaria: [
          {
            min: 1,
            max: 999,
            pay: {
              ffp: 0,
              sectorPay: Math.round((11657 / 42) * 100) / 100,
            },
          },
        ],
        bonus: {
          sectorEquivalent: 3,
        },
      },
      btc: {
        allowance: Math.round((7579 / 12) * 100) / 100,
        simDiaria: [
          {
            min: 1,
            max: 80,
            pay: {
              ffp: 0,
              sectorPay: 129.95,
            },
          },
          {
            min: 81,
            max: 999,
            pay: {
              ffp: 0,
              sectorPay: 279.95,
            },
          },
        ],
        bonus: {
          sectorEquivalent: 3,
        },
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "tri",
    ffp: Math.round((93800 / 12) * 100) / 100, // Same as CPT pre-correction
    sbh: Math.round((35852 / 762) * 100) / 100,
    al: Math.round((5458 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: {
      nonBtc: {
        allowance: Math.round((5500 / 12) * 100) / 100,
        simDiaria: [
          {
            min: 1,
            max: 999,
            pay: {
              ffp: 0,
              sectorPay: Math.round((11657 / 42) * 100) / 100,
            },
          },
        ],
        bonus: {
          sectorEquivalent: 3,
        },
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "ltc",
    ffp: Math.round((93800 / 12) * 100) / 100, // Same as CPT pre-correction
    sbh: Math.round((35852 / 762) * 100) / 100,
    al: Math.round((5458 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: {
      allowance: Math.round((16000 / 12) * 100) / 100,
      bonus: {
        pay: [
          {
            min: 0,
            max: 250,
            pay: 0,
          },
          {
            min: 251,
            max: 363,
            pay: 40,
          },
        ],
        minSectors: 251,
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "ltcs",
    ffp: Math.round((93800 / 12) * 100) / 100, // Same as CPT/LTC
    sbh: Math.round((35852 / 762) * 100) / 100,
    al: Math.round((5458 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: {
      allowance: Math.round((6000 / 12) * 100) / 100, // €6,000/year = €500/month (LTC allowance added during calculation)
      bonus: {
        pay: [
          { min: 0, max: 250, pay: 0 },
          { min: 251, max: 363, pay: 40 },
        ],
        minSectors: 251,
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "lcc",
    ffp: Math.round((93800 / 12) * 100) / 100, // Same as CPT pre-correction
    sbh: Math.round((35852 / 762) * 100) / 100,
    al: Math.round((5458 / 29) * 100) / 100,
    oob: 160,
    woff: 900,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: {
      allowance: Math.round((5500 / 12) * 100) / 100,
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
  {
    company: "RYR",
    role: "pil",
    rank: "sfi",
    basic: Math.round((10075 / 13) * 100) / 100,
    ffp: Math.round((47803 / 12) * 100) / 100, // Pre-correction: 39732
    sbh: Math.round((12833 / 850) * 100) / 100,
    al: Math.round((3828 / 29) * 100) / 100,
    oob: 155,
    woff: 450,
    allowance: 0,
    diaria: 46.48,
    noFlyDiaria: 46.55,
    rsa: 51.92,
    itud: 120,
    trainingConfig: {
      nonBtc: {
        allowance: Math.round((6600 / 12) * 100) / 100,
        simDiaria: [
          {
            min: 1,
            max: 999,
            pay: {
              ffp: 0,
              sectorPay: 111.43,
            },
          },
        ],
      },
      btc: {
        allowance: Math.round((5500 / 12) * 100) / 100,
        simDiaria: [
          {
            min: 1,
            max: 80,
            pay: {
              ffp: 0,
              sectorPay: 61.65,
            },
          },
          {
            min: 81,
            max: 999,
            pay: {
              ffp: 0,
              sectorPay: 167.47,
            },
          },
        ],
      },
    },
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
];

export async function seedClaContracts2026(
  dataSource: DataSource,
  adminUserId: string,
): Promise<void> {
  const repository = dataSource.getRepository(ClaContract);

  console.log("Seeding CLA Contracts 2026 (Apr 2026 - Mar 2027)...");

  let created = 0;
  for (const contractData of CONTRACTS_2026) {
    const existing = await repository.findOne({
      where: {
        rank: contractData.rank,
        effectiveYear: contractData.effectiveYear,
        effectiveMonth: contractData.effectiveMonth,
      } as any,
    });
    if (existing) continue;
    const contract = repository.create({
      ...contractData,
      trainingConfig: contractData.trainingConfig || undefined,
      createdBy: adminUserId,
      version: 1,
    } as any);
    await repository.save(contract);
    console.log(`  Created ${contractData.rank} contract for 2026`);
    created++;
  }

  console.log(
    created > 0
      ? `Seeded ${created} CLA Contracts for 2026`
      : "CLA Contracts 2026 already seeded — skipped",
  );
}
