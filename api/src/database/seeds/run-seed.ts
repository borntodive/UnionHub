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
import { seedClaContracts } from "./cla-contracts.seed";
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
  entities: [User, Base, Contract, Grade, RefreshToken, UserStatusHistory, ClaContract, ClaContractHistory],
  synchronize: false,
});

async function runSeed() {
  console.log("Connecting to database...");
  await dataSource.initialize();
  console.log("Connected!");

  try {
    // Seed Bases
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
      } else {
        console.log(`  Base ${baseData.codice} already exists`);
      }
    }

    // Seed Contracts
    console.log("Seeding contracts...");
    const contractsRepository = dataSource.getRepository(Contract);
    const defaultContracts = [
      // Pilot contracts
      { codice: "MAY-PI", nome: "MAY - Piloti" },
      { codice: "AFA", nome: "AFA" },
      { codice: "Contractor", nome: "Contractor" },
      { codice: "DAC", nome: "DAC" },
      // Cabin Crew contracts
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
      } else {
        console.log(`  Contract ${contractData.codice} already exists`);
      }
    }

    // Seed Grades
    console.log("Seeding grades...");
    const gradesRepository = dataSource.getRepository(Grade);
    const defaultGrades = [
      // Pilot grades
      { codice: "SO", nome: "Second Officer", ruolo: Ruolo.PILOT },
      { codice: "JFO", nome: "Junior First Officer", ruolo: Ruolo.PILOT },
      { codice: "FO", nome: "First Officer", ruolo: Ruolo.PILOT },
      { codice: "CPT", nome: "Captain", ruolo: Ruolo.PILOT },
      { codice: "LTC", nome: "Line Training Captain", ruolo: Ruolo.PILOT },
      { codice: "SFI", nome: "Synthetic Flight Instructor", ruolo: Ruolo.PILOT },
      { codice: "LCC", nome: "Line Check Captain", ruolo: Ruolo.PILOT },
      { codice: "TRI", nome: "Type Rating Instructor", ruolo: Ruolo.PILOT },
      { codice: "TRE", nome: "Type Rating Examiner", ruolo: Ruolo.PILOT },
      // Cabin Crew grades
      { codice: "SEPE", nome: "Senior Purser Europe", ruolo: Ruolo.CABIN_CREW },
      { codice: "SEPI", nome: "Senior Purser Intercontinental", ruolo: Ruolo.CABIN_CREW },
      { codice: "CC", nome: "Cabin Crew", ruolo: Ruolo.CABIN_CREW },
      { codice: "JPU", nome: "Junior Purser", ruolo: Ruolo.CABIN_CREW },
      { codice: "JU", nome: "Junior", ruolo: Ruolo.CABIN_CREW },
    ];

    for (const gradeData of defaultGrades) {
      const existing = await gradesRepository.findOne({
        where: { codice: gradeData.codice },
      });
      if (!existing) {
        await gradesRepository.save(gradesRepository.create(gradeData));
        console.log(`  Created grade: ${gradeData.codice}`);
      } else {
        console.log(`  Grade ${gradeData.codice} already exists`);
      }
    }

    // Seed SuperAdmin
    console.log("Seeding SuperAdmin...");
    const usersRepository = dataSource.getRepository(User);
    const adminCrewcode = process.env.DEFAULT_ADMIN_CREWCODE || "SUPERADMIN";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "changeme";

    const existingAdmin = await usersRepository.findOne({
      where: { crewcode: adminCrewcode },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = usersRepository.create({
        crewcode: adminCrewcode,
        password: hashedPassword,
        role: UserRole.SUPERADMIN,
        mustChangePassword: true,
        isActive: true,
        nome: "Super",
        cognome: "Admin",
        email: "admin@unionhub.app",
        ruolo: null,
      });
      await usersRepository.save(admin);
      console.log(`  Created SuperAdmin: ${adminCrewcode}`);
      console.log(`  Default password: ${adminPassword}`);
      console.log(
        "  IMPORTANT: Change the default password after first login!",
      );
    } else {
      console.log(`  SuperAdmin ${adminCrewcode} already exists`);
    }

    // Seed CLA Contracts - seed both 2025 and 2026
    const superAdmin = await usersRepository.findOne({
      where: { crewcode: adminCrewcode },
    });
    if (superAdmin) {
      await seedClaContracts2025(dataSource, superAdmin.id);
      await seedClaContracts2026(dataSource, superAdmin.id);
    }

    // Seed Role Admins
    console.log("Seeding Role Admins...");
    
    // Admin Piloti
    const existingPilotAdmin = await usersRepository.findOne({
      where: { crewcode: "ADMINPILOT" },
    });
    if (!existingPilotAdmin) {
      const hashedPassword = await bcrypt.hash("password", 10);
      await usersRepository.save(usersRepository.create({
        crewcode: "ADMINPILOT",
        password: hashedPassword,
        role: UserRole.ADMIN,
        ruolo: Ruolo.PILOT,
        mustChangePassword: true,
        isActive: true,
        nome: "Admin",
        cognome: "Piloti",
        email: "admin.piloti@unionhub.app",
      }));
      console.log("  Created Admin Piloti: ADMINPILOT / password");
    } else {
      console.log("  Admin Piloti already exists");
    }

    // Admin Cabin Crew
    const existingCCAdmin = await usersRepository.findOne({
      where: { crewcode: "ADMINCC" },
    });
    if (!existingCCAdmin) {
      const hashedPassword = await bcrypt.hash("password", 10);
      await usersRepository.save(usersRepository.create({
        crewcode: "ADMINCC",
        password: hashedPassword,
        role: UserRole.ADMIN,
        ruolo: Ruolo.CABIN_CREW,
        mustChangePassword: true,
        isActive: true,
        nome: "Admin",
        cognome: "CabinCrew",
        email: "admin.cc@unionhub.app",
      }));
      console.log("  Created Admin Cabin Crew: ADMINCC / password");
    } else {
      console.log("  Admin Cabin Crew already exists");
    }

    // Fetch all reference data for random assignment
    console.log("Fetching reference data for users...");
    const allBases = await basesRepository.find();
    const allGrades = await gradesRepository.find();
    const pilotContracts = await contractsRepository.find({
      where: [
        { codice: "MAY-PI" },
        { codice: "AFA" },
        { codice: "Contractor" },
        { codice: "DAC" },
      ],
    });
    const ccContracts = await contractsRepository.find({
      where: [
        { codice: "MAY-CC" },
        { codice: "CrewLink" },
      ],
    });

    const pilotGrades = allGrades.filter(g => g.ruolo === Ruolo.PILOT);
    const ccGrades = allGrades.filter(g => g.ruolo === Ruolo.CABIN_CREW);

    console.log(`  Found ${allBases.length} bases, ${pilotContracts.length} pilot contracts, ${pilotGrades.length} pilot grades`);
    console.log(`  Found ${ccContracts.length} CC contracts, ${ccGrades.length} CC grades`);

    // Seed 100 Pilots
    console.log("Seeding 100 Pilots...");
    let pilotsCreated = 0;
    const firstNames = ["Marco", "Luca", "Giuseppe", "Antonio", "Giovanni", "Roberto", "Mario", "Andrea", "Stefano", "Francesco", "Paolo", "Alessandro", "Davide", "Simone", "Matteo", "Fabio", "Claudio", "Daniele", "Alessio", "Federico", "Emanuele", "Riccardo", "Massimo", "Vincenzo", "Salvatore", "Enrico", "Gabriele", "Lorenzo", "Nicola", "Pietro", "Domenico", "Giorgio", "Angelo", "Cristian", "Michele", "Valerio", "Gianluca", "Tommaso", "Alberto", "Edoardo", "Filippo", "Raffaele", "Samuele", "Diego", "Jacopo", "Leonardo", "Mattia", "Nicolò", "Omar", "Patrick"];
    const lastNames = ["Rossi", "Bianchi", "Ferrari", "Esposito", "Romano", "Gallo", "Costa", "Fontana", "Conti", "Ricci", "Bruno", "Greco", "Moretti", "Marino", "Rizzo", "Lombardi", "Barbieri", "Santoro", "Ferraro", "De Luca", "Leone", "D'Angelo", "Longo", "Gatti", "Serra", "Caruso", "Mariani", "Martini", "Marchetti", "Galli", "Ferri", "Testa", "Grasso", "Pellegrini", "Monti", "Palma", "Coppola", "Mazza", "Ferrera", "Battaglia", "Bellini", "Basile", "Benedetti", "Bernardi", "Berti", "Bianchini", "Bindi", "Blasi", "Bo", "Bondi"];

    for (let i = 1; i <= 100; i++) {
      const crewcode = `PIL${i.toString().padStart(4, '0')}`;
      const existing = await usersRepository.findOne({ where: { crewcode } });
      
      if (!existing) {
        const hashedPassword = await bcrypt.hash("password", 10);
        const nome = firstNames[Math.floor(Math.random() * firstNames.length)];
        const cognome = lastNames[Math.floor(Math.random() * lastNames.length)];
        const base = allBases[Math.floor(Math.random() * allBases.length)];
        const contract = pilotContracts[Math.floor(Math.random() * pilotContracts.length)];
        const grade = pilotGrades[Math.floor(Math.random() * pilotGrades.length)];

        await usersRepository.save(usersRepository.create({
          crewcode,
          password: hashedPassword,
          role: UserRole.USER,
          ruolo: Ruolo.PILOT,
          mustChangePassword: true,
          isActive: true,
          nome,
          cognome,
          email: `${nome.toLowerCase()}.${cognome.toLowerCase()}.${i}@test.com`,
          base,
          contratto: contract,
          grade,
        }));
        pilotsCreated++;
      }
    }
    console.log(`  Created ${pilotsCreated} pilots`);

    // Seed 100 Cabin Crew
    console.log("Seeding 100 Cabin Crew...");
    let ccCreated = 0;

    for (let i = 1; i <= 100; i++) {
      const crewcode = `CC${i.toString().padStart(4, '0')}`;
      const existing = await usersRepository.findOne({ where: { crewcode } });
      
      if (!existing) {
        const hashedPassword = await bcrypt.hash("password", 10);
        const nome = firstNames[Math.floor(Math.random() * firstNames.length)];
        const cognome = lastNames[Math.floor(Math.random() * lastNames.length)];
        const base = allBases[Math.floor(Math.random() * allBases.length)];
        const contract = ccContracts[Math.floor(Math.random() * ccContracts.length)];
        const grade = ccGrades[Math.floor(Math.random() * ccGrades.length)];

        await usersRepository.save(usersRepository.create({
          crewcode,
          password: hashedPassword,
          role: UserRole.USER,
          ruolo: Ruolo.CABIN_CREW,
          mustChangePassword: true,
          isActive: true,
          nome,
          cognome,
          email: `${nome.toLowerCase()}.${cognome.toLowerCase()}.${i}@test.com`,
          base,
          contratto: contract,
          grade,
        }));
        ccCreated++;
      }
    }
    console.log(`  Created ${ccCreated} cabin crew`);

    console.log("\nSeed completed successfully!");
    console.log("\n--- LOGIN CREDENTIALS ---");
    console.log("SuperAdmin: SUPERADMIN / changeme");
    console.log("Admin Piloti: ADMINPILOT / password");
    console.log("Admin Cabin Crew: ADMINCC / password");
    console.log("Piloti: PIL0001-PIL0100 / password");
    console.log("Cabin Crew: CC0001-CC0100 / password");
  } catch (error) {
    console.error("Error during seed:", error);
  } finally {
    await dataSource.destroy();
  }
}

runSeed();
