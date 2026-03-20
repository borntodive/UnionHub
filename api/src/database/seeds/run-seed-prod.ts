/**
 * PRODUCTION SEED
 *
 * Creates ONLY the SuperAdmin account.
 * All other data (bases, contracts, grades, CLA contracts) is seeded
 * without any test users.
 *
 * mustChangePassword is TRUE for the SuperAdmin — password must be
 * changed on first login.
 *
 * Usage:
 *   npm run seed:prod
 *
 * Configure the admin password via environment variable:
 *   DEFAULT_ADMIN_PASSWORD=your-secure-password npm run seed:prod
 */

import { DataSource } from "typeorm";
import { config } from "dotenv";
import { User } from "../../users/entities/user.entity";
import { Base } from "../../bases/entities/base.entity";
import { Contract } from "../../contracts/entities/contract.entity";
import { Grade } from "../../grades/entities/grade.entity";
import { RefreshToken } from "../../refresh-tokens/entities/refresh-token.entity";
import { UserStatusHistory } from "../../users/entities/user-status-history.entity";
import { ClaContract } from "../../cla-contracts/entities/cla-contract.entity";
import { ClaContractHistory } from "../../cla-contracts/entities/cla-contract-history.entity";
import { UserRole } from "../../common/enums/user-role.enum";
import { Ruolo } from "../../common/enums/ruolo.enum";
import * as bcrypt from "bcrypt";
import { seedClaContracts2025 } from "./cla-contracts-2025.seed";
import { seedClaContracts2026 } from "./cla-contracts-2026.seed";

config();

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_DATABASE || "unionhub",
  entities: [
    User,
    Base,
    Contract,
    Grade,
    RefreshToken,
    UserStatusHistory,
    ClaContract,
    ClaContractHistory,
  ],
  synchronize: false,
});

async function runSeedProd() {
  console.log("[PROD SEED] Connecting to database...");
  await dataSource.initialize();
  console.log("[PROD SEED] Connected!");

  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error(
      "[PROD SEED] ERROR: DEFAULT_ADMIN_PASSWORD env variable is not set. Aborting.",
    );
    await dataSource.destroy();
    process.exit(1);
  }

  try {
    // ── Bases ──────────────────────────────────────────────────────────────
    console.log("[PROD SEED] Seeding bases...");
    const basesRepository = dataSource.getRepository(Base);
    const defaultBases = [
      { codice: "BRI", nome: "Bari" },
      { codice: "BGY", nome: "Bergamo" },
      { codice: "BLQ", nome: "Bologna" },
      { codice: "BDS", nome: "Brindisi" },
      { codice: "CAG", nome: "Cagliari" },
      { codice: "CTA", nome: "Catania" },
      { codice: "CIA", nome: "Ciampino" },
      { codice: "EMA", nome: "East Midlands" },
      { codice: "FCO", nome: "Fiumicino" },
      { codice: "FLI", nome: "Floater Italia" },
      { codice: "SUF", nome: "Lamezia" },
      { codice: "MXP", nome: "Malpensa" },
      { codice: "NAP", nome: "Napoli" },
      { codice: "PMO", nome: "Palermo" },
      { codice: "PSR", nome: "Pescara" },
      { codice: "PSA", nome: "Pisa" },
      { codice: "STN", nome: "Stansted" },
      { codice: "TRN", nome: "Torino" },
      { codice: "TSF", nome: "Treviso" },
      { codice: "VCE", nome: "Venezia" },
    ];

    for (const baseData of defaultBases) {
      const existing = await basesRepository.findOne({
        where: { codice: baseData.codice },
      });
      if (!existing) {
        await basesRepository.save(basesRepository.create(baseData));
        console.log(`  Created base: ${baseData.codice}`);
      }
    }

    // ── Contracts ─────────────────────────────────────────────────────────
    console.log("[PROD SEED] Seeding contracts...");
    const contractsRepository = dataSource.getRepository(Contract);
    const defaultContracts = [
      { codice: "MAY-PI", nome: "MAY - Piloti" },
      { codice: "AFA", nome: "AFA" },
      { codice: "Contractor", nome: "Contractor" },
      { codice: "DAC", nome: "DAC" },
      { codice: "MAY-CC", nome: "MAY - Cabin Crew" },
      { codice: "CrewLink", nome: "CrewLink" },
    ];

    for (const contractData of defaultContracts) {
      const existing = await contractsRepository.findOne({
        where: { codice: contractData.codice },
      });
      if (!existing) {
        await contractsRepository.save(
          contractsRepository.create(contractData),
        );
        console.log(`  Created contract: ${contractData.codice}`);
      }
    }

    // ── Grades ────────────────────────────────────────────────────────────
    console.log("[PROD SEED] Seeding grades...");
    const gradesRepository = dataSource.getRepository(Grade);
    const defaultGrades = [
      // Pilot grades
      { codice: "SO", nome: "Second Officer", ruolo: Ruolo.PILOT },
      { codice: "JFO", nome: "Junior First Officer", ruolo: Ruolo.PILOT },
      { codice: "FO", nome: "First Officer", ruolo: Ruolo.PILOT },
      { codice: "CPT", nome: "Captain", ruolo: Ruolo.PILOT },
      { codice: "LTC", nome: "Line Training Captain", ruolo: Ruolo.PILOT },
      {
        codice: "SFI",
        nome: "Synthetic Flight Instructor",
        ruolo: Ruolo.PILOT,
      },
      { codice: "LCC", nome: "Line Check Captain", ruolo: Ruolo.PILOT },
      { codice: "TRI", nome: "Type Rating Instructor", ruolo: Ruolo.PILOT },
      { codice: "TRE", nome: "Type Rating Examiner", ruolo: Ruolo.PILOT },
      // Cabin Crew grades
      { codice: "JU", nome: "Junior", ruolo: Ruolo.CABIN_CREW },
      { codice: "JPU", nome: "Junior Purser", ruolo: Ruolo.CABIN_CREW },
      { codice: "CC", nome: "Cabin Crew", ruolo: Ruolo.CABIN_CREW },
      { codice: "SEPE", nome: "Senior Purser Europe", ruolo: Ruolo.CABIN_CREW },
      {
        codice: "SEPI",
        nome: "Senior Purser Intercontinental",
        ruolo: Ruolo.CABIN_CREW,
      },
    ];

    for (const gradeData of defaultGrades) {
      const existing = await gradesRepository.findOne({
        where: { codice: gradeData.codice },
      });
      if (!existing) {
        await gradesRepository.save(gradesRepository.create(gradeData));
        console.log(`  Created grade: ${gradeData.codice}`);
      }
    }

    // ── SuperAdmin ────────────────────────────────────────────────────────
    console.log("[PROD SEED] Seeding SuperAdmin...");
    const usersRepository = dataSource.getRepository(User);
    const adminCrewcode = process.env.DEFAULT_ADMIN_CREWCODE || "SUPERADMIN";

    const existingAdmin = await usersRepository.findOne({
      where: { crewcode: adminCrewcode },
    });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await usersRepository.save(
        usersRepository.create({
          crewcode: adminCrewcode,
          password: hashedPassword,
          role: UserRole.SUPERADMIN,
          mustChangePassword: true, // MUST change on first login
          isActive: true,
          nome: "Super",
          cognome: "Admin",
          email: "admin@unionhub.app",
          ruolo: null,
        }),
      );
      console.log(`  Created SuperAdmin: ${adminCrewcode}`);
      console.log(
        "  mustChangePassword: TRUE — password must be changed on first login",
      );
    } else {
      console.log(`  SuperAdmin ${adminCrewcode} already exists`);
    }

    // ── CLA Contracts ─────────────────────────────────────────────────────
    const superAdmin = await usersRepository.findOne({
      where: { crewcode: adminCrewcode },
    });
    if (superAdmin) {
      await seedClaContracts2025(dataSource, superAdmin.id);
      await seedClaContracts2026(dataSource, superAdmin.id);
    }

    console.log("\n[PROD SEED] Completed successfully!");
    console.log(
      `  SuperAdmin: ${adminCrewcode} — password set from DEFAULT_ADMIN_PASSWORD env`,
    );
    console.log("  No test users created.");
  } catch (error) {
    console.error("[PROD SEED] Error:", error);
  } finally {
    await dataSource.destroy();
  }
}

runSeedProd();
