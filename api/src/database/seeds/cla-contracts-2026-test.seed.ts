// CLA Contracts Seed - TEST for 2026 with CPT Seniority Brackets
// This seeder is for testing purposes only

import { DataSource } from "typeorm";
import { ClaContract } from "../../cla-contracts/entities/cla-contract.entity";

const CONTRACTS_2026_TEST = [
  // ========== PILOTS - Line Crew - CPT with Seniority Brackets ==========
  {
    company: "RYR",
    role: "pil",
    rank: "cpt",
    basic: 1153.85,
    ffp: 7087.0,
    sbh: 42.2,
    al: 165.0,
    oob: 160.0,
    woff: 900.0,
    allowance: 666.67,
    diaria: 46.4789,
    noFlyDiaria: 46.4789,
    rsa: 51.92,
    itud: 120.0,
    trainingConfig: null,
    seniorityBrackets: [
      { minYears: 0, maxYears: 4, ffp: 8000, sbh: 50 },
      { minYears: 5, maxYears: 9, ffp: 8500, sbh: 60 },
    ],
    effectiveYear: 2026,
    effectiveMonth: 4,
    isActive: true,
  },
];

export async function seedClaContracts2026Test(
  dataSource: DataSource,
  adminUserId: string,
): Promise<void> {
  const repository = dataSource.getRepository(ClaContract);

  console.log(
    "Seeding CLA Contracts 2026 TEST (with CPT seniority brackets)...",
  );

  let created = 0;
  for (const contractData of CONTRACTS_2026_TEST) {
    const existing = await repository.findOne({
      where: {
        rank: contractData.rank,
        effectiveYear: contractData.effectiveYear,
        effectiveMonth: contractData.effectiveMonth,
      } as any,
    });
    if (existing) {
      console.log(`  Skipping ${contractData.rank} - already exists`);
      continue;
    }
    const contract = repository.create({
      ...contractData,
      trainingConfig: contractData.trainingConfig || undefined,
      createdBy: adminUserId,
      version: 1,
    } as any);
    await repository.save(contract);
    console.log(
      `  Created ${contractData.rank} TEST contract with seniority brackets`,
    );
    created++;
  }

  console.log(
    created > 0
      ? `Seeded ${created} TEST CLA Contracts for 2026`
      : "TEST CLA Contracts 2026 already exist — skipped",
  );
}
