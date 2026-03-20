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

const DEFAULT_PASSWORD = "password";

const FIRST_NAMES = [
  "Marco",
  "Luca",
  "Giuseppe",
  "Antonio",
  "Giovanni",
  "Roberto",
  "Mario",
  "Andrea",
  "Stefano",
  "Francesco",
  "Paolo",
  "Alessandro",
  "Davide",
  "Simone",
  "Matteo",
  "Fabio",
  "Claudio",
  "Daniele",
  "Alessio",
  "Federico",
  "Emanuele",
  "Riccardo",
  "Massimo",
  "Vincenzo",
  "Salvatore",
  "Enrico",
  "Gabriele",
  "Lorenzo",
  "Nicola",
  "Pietro",
  "Domenico",
  "Giorgio",
  "Angelo",
  "Cristian",
  "Michele",
  "Valerio",
  "Gianluca",
  "Tommaso",
  "Alberto",
  "Edoardo",
  "Filippo",
  "Raffaele",
  "Samuele",
  "Diego",
  "Jacopo",
  "Leonardo",
  "Mattia",
  "Nicolò",
  "Omar",
  "Patrick",
];

const LAST_NAMES = [
  "Rossi",
  "Bianchi",
  "Ferrari",
  "Esposito",
  "Romano",
  "Gallo",
  "Costa",
  "Fontana",
  "Conti",
  "Ricci",
  "Bruno",
  "Greco",
  "Moretti",
  "Marino",
  "Rizzo",
  "Lombardi",
  "Barbieri",
  "Santoro",
  "Ferraro",
  "De Luca",
  "Leone",
  "D'Angelo",
  "Longo",
  "Gatti",
  "Serra",
  "Caruso",
  "Mariani",
  "Martini",
  "Marchetti",
  "Galli",
  "Ferri",
  "Testa",
  "Grasso",
  "Pellegrini",
  "Monti",
  "Palma",
  "Coppola",
  "Mazza",
  "Ferrera",
  "Battaglia",
  "Bellini",
  "Basile",
  "Benedetti",
  "Bernardi",
  "Berti",
  "Bianchini",
  "Bindi",
  "Blasi",
  "Bo",
  "Bondi",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 100 pilots across 9 grades: [SO=11, JFO=11, FO=12, CPT=12, LTC=11, SFI=11, LCC=11, TRI=10, TRE=11]
const PILOT_DISTRIBUTION: { codice: string; count: number }[] = [
  { codice: "SO", count: 11 },
  { codice: "JFO", count: 11 },
  { codice: "FO", count: 12 },
  { codice: "CPT", count: 12 },
  { codice: "LTC", count: 11 },
  { codice: "SFI", count: 11 },
  { codice: "LCC", count: 11 },
  { codice: "TRI", count: 10 },
  { codice: "TRE", count: 11 },
];

// 100 cabin crew across 5 grades: 20 each
const CC_DISTRIBUTION: { codice: string; count: number }[] = [
  { codice: "JU", count: 20 },
  { codice: "JPU", count: 20 },
  { codice: "CC", count: 20 },
  { codice: "SEPE", count: 20 },
  { codice: "SEPI", count: 20 },
];

async function runSeed() {
  console.log("Connecting to database...");
  await dataSource.initialize();
  console.log("Connected!");

  try {
    // ── Bases ──────────────────────────────────────────────────────────────
    console.log("Seeding bases...");
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
    console.log("Seeding contracts...");
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
    console.log("Seeding grades...");
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

    // Reload all grades indexed by codice for fast lookup
    const allGrades = await gradesRepository.find();
    const gradeByCode = new Map(allGrades.map((g) => [g.codice, g]));

    // ── Reference data for random assignment ──────────────────────────────
    const allBases = await basesRepository.find();
    const pilotContracts = await contractsRepository.find({
      where: [
        { codice: "MAY-PI" },
        { codice: "AFA" },
        { codice: "Contractor" },
        { codice: "DAC" },
      ],
    });
    const ccContracts = await contractsRepository.find({
      where: [{ codice: "MAY-CC" }, { codice: "CrewLink" }],
    });

    const usersRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // ── SuperAdmin ────────────────────────────────────────────────────────
    console.log("Seeding SuperAdmin...");
    const existingAdmin = await usersRepository.findOne({
      where: { crewcode: "SUPERADMIN" },
    });
    if (!existingAdmin) {
      const admin = usersRepository.create({
        crewcode: "SUPERADMIN",
        password: hashedPassword,
        role: UserRole.SUPERADMIN,
        mustChangePassword: false,
        isActive: true,
        nome: "Super",
        cognome: "Admin",
        email: "admin@unionhub.app",
        ruolo: null,
      });
      await usersRepository.save(admin);
      console.log("  Created SuperAdmin: SUPERADMIN / password");
    } else {
      console.log("  SuperAdmin already exists");
    }

    // ── CLA Contracts ─────────────────────────────────────────────────────
    const superAdmin = await usersRepository.findOne({
      where: { crewcode: "SUPERADMIN" },
    });
    if (superAdmin) {
      await seedClaContracts2025(dataSource, superAdmin.id);
      await seedClaContracts2026(dataSource, superAdmin.id);
    }

    // ── Admin Piloti ──────────────────────────────────────────────────────
    console.log("Seeding Role Admins...");
    const existingPilotAdmin = await usersRepository.findOne({
      where: { crewcode: "ADMINPILOT" },
    });
    if (!existingPilotAdmin) {
      await usersRepository.save(
        usersRepository.create({
          crewcode: "ADMINPILOT",
          password: hashedPassword,
          role: UserRole.ADMIN,
          ruolo: Ruolo.PILOT,
          mustChangePassword: false,
          isActive: true,
          nome: "Admin",
          cognome: "Piloti",
          email: "admin.piloti@unionhub.app",
        }),
      );
      console.log("  Created Admin Piloti: ADMINPILOT / password");
    } else {
      console.log("  Admin Piloti already exists");
    }

    // ── Admin Cabin Crew ──────────────────────────────────────────────────
    const existingCCAdmin = await usersRepository.findOne({
      where: { crewcode: "ADMINCC" },
    });
    if (!existingCCAdmin) {
      await usersRepository.save(
        usersRepository.create({
          crewcode: "ADMINCC",
          password: hashedPassword,
          role: UserRole.ADMIN,
          ruolo: Ruolo.CABIN_CREW,
          mustChangePassword: false,
          isActive: true,
          nome: "Admin",
          cognome: "CabinCrew",
          email: "admin.cc@unionhub.app",
        }),
      );
      console.log("  Created Admin Cabin Crew: ADMINCC / password");
    } else {
      console.log("  Admin Cabin Crew already exists");
    }

    // ── 100 Pilots (grade-coded crewcodes) ────────────────────────────────
    console.log("Seeding 100 Pilots...");
    let pilotsCreated = 0;

    for (const { codice, count } of PILOT_DISTRIBUTION) {
      const grade = gradeByCode.get(codice);
      if (!grade) continue;

      for (let i = 1; i <= count; i++) {
        const crewcode = `${codice}${i.toString().padStart(4, "0")}`;
        const existing = await usersRepository.findOne({ where: { crewcode } });
        if (existing) continue;

        const nome = randomFrom(FIRST_NAMES);
        const cognome = randomFrom(LAST_NAMES);
        const base = randomFrom(allBases);
        const contratto = randomFrom(pilotContracts);

        await usersRepository.save(
          usersRepository.create({
            crewcode,
            password: hashedPassword,
            role: UserRole.USER,
            ruolo: Ruolo.PILOT,
            mustChangePassword: false,
            isActive: true,
            nome,
            cognome,
            email: `${crewcode.toLowerCase()}@test.com`,
            base,
            contratto,
            grade,
          }),
        );
        pilotsCreated++;
      }
    }
    console.log(`  Created ${pilotsCreated} pilots`);

    // ── 100 Cabin Crew (grade-coded crewcodes) ────────────────────────────
    console.log("Seeding 100 Cabin Crew...");
    let ccCreated = 0;

    for (const { codice, count } of CC_DISTRIBUTION) {
      const grade = gradeByCode.get(codice);
      if (!grade) continue;

      for (let i = 1; i <= count; i++) {
        const crewcode = `${codice}${i.toString().padStart(4, "0")}`;
        const existing = await usersRepository.findOne({ where: { crewcode } });
        if (existing) continue;

        const nome = randomFrom(FIRST_NAMES);
        const cognome = randomFrom(LAST_NAMES);
        const base = randomFrom(allBases);
        const contratto = randomFrom(ccContracts);

        await usersRepository.save(
          usersRepository.create({
            crewcode,
            password: hashedPassword,
            role: UserRole.USER,
            ruolo: Ruolo.CABIN_CREW,
            mustChangePassword: false,
            isActive: true,
            nome,
            cognome,
            email: `${crewcode.toLowerCase()}@test.com`,
            base,
            contratto,
            grade,
          }),
        );
        ccCreated++;
      }
    }
    console.log(`  Created ${ccCreated} cabin crew`);

    console.log("\nSeed completed successfully!");
    console.log("\n--- LOGIN CREDENTIALS ---");
    console.log("SuperAdmin:       SUPERADMIN / password");
    console.log("Admin Piloti:     ADMINPILOT / password");
    console.log("Admin Cabin Crew: ADMINCC    / password");
    console.log(
      "Pilots:  SO0001, JFO0001, FO0001, CPT0001, LTC0001, SFI0001, LCC0001, TRI0001, TRE0001 / password",
    );
    console.log(
      "CC:      JU0001, JPU0001, CC0001, SEPE0001, SEPI0001 / password",
    );
  } catch (error) {
    console.error("Error during seed:", error);
  } finally {
    await dataSource.destroy();
  }
}

runSeed();
