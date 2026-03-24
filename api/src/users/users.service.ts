import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Brackets, In } from "typeorm";
import * as bcrypt from "bcrypt";
import { parse } from "csv-parse/sync";
import * as xlsx from "xlsx";
import { User, StatusLogEntry } from "./entities/user.entity";
import {
  UserStatusHistory,
  StatusChangeType,
} from "./entities/user-status-history.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
import { MailService, RsaRlsContact } from "../mail/mail.service";

interface FindAllOptions {
  role?: UserRole;
  ruolo?: Ruolo;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserStatusHistory)
    private statusHistoryRepository: Repository<UserStatusHistory>,
    private readonly mailService: MailService,
  ) {}

  // Helper to add entry to statusLog
  private addStatusLogEntry(
    user: User,
    isActive: boolean,
    reason: string,
    performedById: string,
  ): void {
    const entry: StatusLogEntry = {
      isActive,
      timestamp: new Date().toISOString(),
      reason,
      performedBy: performedById,
    };

    if (!user.statusLog) {
      user.statusLog = [];
    }
    user.statusLog.push(entry);
    // Keep only last 10 entries to prevent the JSON from growing too large
    if (user.statusLog.length > 10) {
      user.statusLog = user.statusLog.slice(-10);
    }
  }

  async findAll(
    options: FindAllOptions,
    requestingUser: User,
  ): Promise<{ data: User[]; total: number; page: number; perPage: number }> {
    const {
      role,
      ruolo,
      baseId,
      contrattoId,
      gradeId,
      isActive,
      search,
      page = 1,
      perPage = 20,
    } = options;

    const where: any = {};

    // Admin scoping: Admin sees only members of their own professional role
    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      where.ruolo = requestingUser.ruolo;
    }

    // SuperAdmin can filter by role
    if (role && requestingUser.role === UserRole.SUPERADMIN) {
      where.role = role;
    }

    if (ruolo) {
      where.ruolo = ruolo;
    }

    if (baseId) {
      where.baseId = baseId;
    }

    if (contrattoId) {
      where.contrattoId = contrattoId;
    }

    if (gradeId) {
      where.gradeId = gradeId;
    }

    // Use QueryBuilder for more complex queries
    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.base", "base")
      .leftJoinAndSelect("user.contratto", "contratto")
      .leftJoinAndSelect("user.grade", "grade")
      .where(where)
      .andWhere("user.isActive = :isActive", {
        isActive: isActive !== undefined ? isActive : true,
      })
      .orderBy("user.cognome", "ASC")
      .addOrderBy("user.nome", "ASC")
      .skip((page - 1) * perPage)
      .take(perPage);

    // Search by nome, cognome, crewcode, or email
    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where("user.nome ILIKE :search", { search: `%${search}%` })
            .orWhere("user.cognome ILIKE :search", { search: `%${search}%` })
            .orWhere("user.crewcode ILIKE :search", { search: `%${search}%` })
            .orWhere("user.email ILIKE :search", { search: `%${search}%` });
        }),
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      perPage,
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ["base", "contratto", "grade"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async findByCrewcode(
    crewcode: string,
    includeDeleted = false,
  ): Promise<User | null> {
    const query = this.usersRepository
      .createQueryBuilder("user")
      .where("user.crewcode = :crewcode", { crewcode: crewcode.toUpperCase() })
      .leftJoinAndSelect("user.base", "base")
      .leftJoinAndSelect("user.contratto", "contratto")
      .leftJoinAndSelect("user.grade", "grade");

    if (!includeDeleted) {
      query.andWhere("user.isActive = true");
    }

    return query.getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async create(
    createUserDto: CreateUserDto,
    requestingUser: User,
  ): Promise<User> {
    // Check if user has permission to create this type of user
    if (requestingUser.role === UserRole.ADMIN) {
      // Admin can only create users of their own professional role
      if (createUserDto.ruolo && createUserDto.ruolo !== requestingUser.ruolo) {
        throw new ForbiddenException(
          "Admin can only create users of their own professional role",
        );
      }
      // Admin cannot create other admins or superadmins
      if (createUserDto.role && createUserDto.role !== UserRole.USER) {
        throw new ForbiddenException("Admin can only create regular users");
      }
    }

    // Check crewcode first (includes inactive users for reactivation)
    const existingCrewcode = await this.findByCrewcode(
      createUserDto.crewcode,
      true,
    );

    if (existingCrewcode) {
      if (!existingCrewcode.isActive) {
        // User was previously deactivated - reactivate and update
        return this.reactivateUser(
          existingCrewcode,
          createUserDto,
          requestingUser,
        );
      } else {
        throw new ConflictException("Crewcode already exists");
      }
    }

    // Check for duplicate email (only among active users — inactive users can be reactivated)
    const existingEmail = await this.findByEmail(createUserDto.email);
    if (existingEmail) {
      if (!existingEmail.isActive) {
        // Email belongs to a deactivated user with a different crewcode — reactivate them
        return this.reactivateUser(
          existingEmail,
          createUserDto,
          requestingUser,
        );
      }
      throw new ConflictException("Email already exists");
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash("password", 10);

    // Convert dataIscrizione from DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
    let dataIscrizione = createUserDto.dataIscrizione;
    if (dataIscrizione) {
      const parts = dataIscrizione.split("/");
      if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        dataIscrizione = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let dateOfEntry = createUserDto.dateOfEntry;
    if (dateOfEntry) {
      const parts = dateOfEntry.split("/");
      if (parts.length === 3) {
        dateOfEntry = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let dateOfCaptaincy = createUserDto.dateOfCaptaincy;
    if (dateOfCaptaincy) {
      const parts = dateOfCaptaincy.split("/");
      if (parts.length === 3) {
        dateOfCaptaincy = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      crewcode: createUserDto.crewcode.toUpperCase(),
      email: createUserDto.email.toLowerCase(),
      dataIscrizione,
      dateOfEntry,
      dateOfCaptaincy,
      password: hashedPassword,
      mustChangePassword: true,
      isActive: true,
    });

    // Add to status log
    this.addStatusLogEntry(user, true, "User created", requestingUser.id);

    const savedUser = await this.usersRepository.save(user);

    // Create status history entry for new user
    await this.statusHistoryRepository.save({
      userId: savedUser.id,
      changeType: StatusChangeType.ACTIVATION,
      reason: "User created",
      changedById: requestingUser.id,
    });

    // Send welcome email (fire-and-forget — 3s delay to avoid Mailtrap rate limit)
    setTimeout(() => {
      this.getRsaRlsContacts()
        .then((contacts) =>
          this.mailService.sendWelcomeEmail(savedUser, "password", contacts),
        )
        .catch(() => {});
    }, 3000);

    return savedUser;
  }

  private async reactivateUser(
    existingUser: User,
    createUserDto: CreateUserDto,
    requestingUser: User,
  ): Promise<User> {
    // Hash default password
    const hashedPassword = await bcrypt.hash("password", 10);

    // Convert dataIscrizione from DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
    let dataIscrizione = createUserDto.dataIscrizione;
    if (dataIscrizione) {
      const parts = dataIscrizione.split("/");
      if (parts.length === 3) {
        dataIscrizione = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let dateOfEntry = createUserDto.dateOfEntry;
    if (dateOfEntry) {
      const parts = dateOfEntry.split("/");
      if (parts.length === 3) {
        dateOfEntry = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let dateOfCaptaincy = createUserDto.dateOfCaptaincy;
    if (dateOfCaptaincy) {
      const parts = dateOfCaptaincy.split("/");
      if (parts.length === 3) {
        dateOfCaptaincy = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Update user with new data
    Object.assign(existingUser, {
      ...createUserDto,
      crewcode: createUserDto.crewcode.toUpperCase(),
      email: createUserDto.email.toLowerCase(),
      dataIscrizione,
      dateOfEntry,
      dateOfCaptaincy,
      password: hashedPassword,
      mustChangePassword: true,
      isActive: true,
    });

    // Add to status log
    this.addStatusLogEntry(
      existingUser,
      true,
      "User re-registered with same crewcode (previously deactivated)",
      requestingUser.id,
    );

    const savedUser = await this.usersRepository.save(existingUser);

    // Create status history entry for reactivation
    await this.statusHistoryRepository.save({
      userId: savedUser.id,
      changeType: StatusChangeType.REACTIVATION,
      reason: "User re-registered with same crewcode (previously deactivated)",
      changedById: requestingUser.id,
    });

    // Send welcome email (fire-and-forget — 3s delay to avoid Mailtrap rate limit)
    setTimeout(() => {
      this.getRsaRlsContacts()
        .then((contacts) =>
          this.mailService.sendWelcomeEmail(savedUser, "password", contacts),
        )
        .catch(() => {});
    }, 3000);

    return savedUser;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUser: User,
  ): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Admin scoping checks
    if (requestingUser.role === UserRole.ADMIN) {
      // Admin can only edit users of their own professional role
      if (user.ruolo !== requestingUser.ruolo) {
        throw new ForbiddenException(
          "Admin can only edit users of their own professional role",
        );
      }
      // Admin cannot change role to admin/superadmin
      if (updateUserDto.role && updateUserDto.role !== UserRole.USER) {
        throw new ForbiddenException("Admin cannot assign admin privileges");
      }
    }

    // Check for duplicate email if changing
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.findByEmail(updateUserDto.email);
      if (existingEmail) {
        throw new ConflictException("Email already exists");
      }
    }

    // Check for duplicate crewcode if changing
    if (
      updateUserDto.crewcode &&
      updateUserDto.crewcode.toUpperCase() !== user.crewcode
    ) {
      const existingCrewcode = await this.findByCrewcode(
        updateUserDto.crewcode,
        true,
      );
      if (existingCrewcode && existingCrewcode.isActive) {
        throw new ConflictException("Crewcode already exists");
      }
    }

    // Track status change if isActive is being updated
    const oldIsActive = user.isActive;

    // Apply updates
    if (updateUserDto.email) {
      updateUserDto.email = updateUserDto.email.toLowerCase();
    }
    if (updateUserDto.crewcode) {
      updateUserDto.crewcode = updateUserDto.crewcode.toUpperCase();
    }

    // Convert dataIscrizione from DD/MM/YYYY to YYYY-MM-DD for PostgreSQL
    if (updateUserDto.dataIscrizione) {
      const parts = updateUserDto.dataIscrizione.split("/");
      if (parts.length === 3) {
        // DD/MM/YYYY -> YYYY-MM-DD
        updateUserDto.dataIscrizione = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    if (updateUserDto.dateOfEntry) {
      const parts = updateUserDto.dateOfEntry.split("/");
      if (parts.length === 3) {
        updateUserDto.dateOfEntry = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    if (updateUserDto.dateOfCaptaincy) {
      const parts = updateUserDto.dateOfCaptaincy.split("/");
      if (parts.length === 3) {
        updateUserDto.dateOfCaptaincy = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    Object.assign(user, updateUserDto);

    // Add to status log if isActive changed
    if (
      updateUserDto.isActive !== undefined &&
      updateUserDto.isActive !== oldIsActive
    ) {
      this.addStatusLogEntry(
        user,
        updateUserDto.isActive,
        updateUserDto.isActive ? "User activated" : "User deactivated",
        requestingUser.id,
      );
    }

    const savedUser = await this.usersRepository.save(user);

    // Create status history if isActive changed
    if (
      updateUserDto.isActive !== undefined &&
      updateUserDto.isActive !== oldIsActive
    ) {
      await this.statusHistoryRepository.save({
        userId: savedUser.id,
        changeType: updateUserDto.isActive
          ? StatusChangeType.ACTIVATION
          : StatusChangeType.DEACTIVATION,
        reason: updateUserDto.isActive ? "User activated" : "User deactivated",
        changedById: requestingUser.id,
      });
    }

    return savedUser;
  }

  async remove(id: string, requestingUser: User): Promise<void> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Admin scoping
    if (requestingUser.role === UserRole.ADMIN) {
      if (user.ruolo !== requestingUser.ruolo) {
        throw new ForbiddenException(
          "Admin can only delete users of their own professional role",
        );
      }
      if (user.role !== UserRole.USER) {
        throw new ForbiddenException("Admin cannot delete admin users");
      }
    }

    user.isActive = false;
    this.addStatusLogEntry(
      user,
      false,
      "User deactivated (soft delete)",
      requestingUser.id,
    );
    await this.usersRepository.save(user);

    // Create status history entry for deactivation
    await this.statusHistoryRepository.save({
      userId: id,
      changeType: StatusChangeType.DEACTIVATION,
      reason: "User deactivated (soft delete)",
      changedById: requestingUser.id,
    });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(userId, { password: hashedPassword });
  }

  async updateMustChangePassword(
    userId: string,
    mustChange: boolean,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      mustChangePassword: mustChange,
    });
  }

  async countByRole(ruolo: Ruolo): Promise<number> {
    return this.usersRepository.count({
      where: { ruolo, isActive: true },
    });
  }

  async getRecentUsers(
    limit: number = 5,
    requestingUser: User,
  ): Promise<User[]> {
    const where: any = { isActive: true };

    // Admin scoping
    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      where.ruolo = requestingUser.ruolo;
    }

    return this.usersRepository.find({
      where,
      relations: ["base", "contratto", "grade"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  // Get status history for a user
  async getStatusHistory(
    userId: string,
    requestingUser: User,
  ): Promise<UserStatusHistory[]> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Admin scoping
    if (
      requestingUser.role === UserRole.ADMIN &&
      user.ruolo !== requestingUser.ruolo
    ) {
      throw new ForbiddenException(
        "Admin can only view history of their own professional role",
      );
    }

    return this.statusHistoryRepository.find({
      where: { userId },
      relations: ["performedBy"],
      order: { createdAt: "DESC" },
    });
  }

  // ==================== DEACTIVATED USERS MANAGEMENT (SUPERADMIN ONLY) ====================

  async findAllDeactivated(
    options: { search?: string; page?: number; perPage?: number },
    requestingUser: User,
  ): Promise<{ data: User[]; total: number; page: number; perPage: number }> {
    // Only SuperAdmin can access deactivated users
    if (requestingUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        "Only SuperAdmin can access deactivated users",
      );
    }

    const { search, page = 1, perPage = 20 } = options;

    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.base", "base")
      .leftJoinAndSelect("user.contratto", "contratto")
      .leftJoinAndSelect("user.grade", "grade")
      .where("user.isActive = false") // Only deactivated users
      .orderBy("user.cognome", "ASC")
      .skip((page - 1) * perPage)
      .take(perPage);

    // Search by nome, cognome, crewcode, or email
    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where("user.nome ILIKE :search", { search: `%${search}%` })
            .orWhere("user.cognome ILIKE :search", { search: `%${search}%` })
            .orWhere("user.crewcode ILIKE :search", { search: `%${search}%` })
            .orWhere("user.email ILIKE :search", { search: `%${search}%` });
        }),
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      perPage,
    };
  }

  async reactivateDeactivatedUser(
    id: string,
    requestingUser: User,
  ): Promise<User> {
    // Only SuperAdmin can reactivate users
    if (requestingUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException("Only SuperAdmin can reactivate users");
    }

    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ["base", "contratto", "grade"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isActive) {
      throw new ConflictException("User is not deactivated");
    }

    // Reactivate user
    user.isActive = true;
    user.mustChangePassword = true; // Force password change on reactivation

    // Add to status log
    this.addStatusLogEntry(
      user,
      true,
      "User reactivated by SuperAdmin",
      requestingUser.id,
    );

    const savedUser = await this.usersRepository.save(user);

    // Create status history entry
    await this.statusHistoryRepository.save({
      userId: savedUser.id,
      changeType: StatusChangeType.REACTIVATION,
      reason: "User reactivated by SuperAdmin",
      changedById: requestingUser.id,
    });

    return savedUser;
  }

  async permanentlyDelete(id: string, requestingUser: User): Promise<void> {
    // Only SuperAdmin can permanently delete users
    if (requestingUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        "Only SuperAdmin can permanently delete users",
      );
    }

    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isActive) {
      throw new ConflictException(
        "Only deactivated users can be permanently deleted",
      );
    }

    // Delete all status history entries first (due to foreign key constraint)
    await this.statusHistoryRepository.delete({ userId: id });

    // Permanently delete the user
    await this.usersRepository.delete(id);
  }

  // ==================== EXPORT & STATISTICS ====================

  async exportToCsv(
    options: { ruolo?: Ruolo; baseId?: string; contrattoId?: string },
    requestingUser: User,
  ): Promise<{ csv: string; filename: string }> {
    // Admin scoping
    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      options.ruolo = requestingUser.ruolo;
    }

    const where: any = { isActive: true };
    if (options.ruolo) where.ruolo = options.ruolo;
    if (options.baseId) where.baseId = options.baseId;
    if (options.contrattoId) where.contrattoId = options.contrattoId;

    const users = await this.usersRepository.find({
      where,
      relations: ["base", "contratto", "grade"],
      order: { cognome: "ASC", nome: "ASC" },
    });

    // CSV Header
    const headers = [
      "Crewcode",
      "Nome",
      "Cognome",
      "Email",
      "Telefono",
      "Ruolo",
      "Base",
      "Contratto",
      "Qualifica",
      "Data Iscrizione",
      "ITUD",
      "RSA",
      "Note",
    ];

    // CSV Rows
    const rows = users.map((user) => [
      user.crewcode,
      user.nome,
      user.cognome,
      user.email,
      user.telefono || "",
      user.ruolo || "",
      user.base?.nome || "",
      user.contratto?.nome || "",
      user.grade?.nome || "",
      user.dataIscrizione || "",
      user.itud ? "Sì" : "No",
      user.rsa ? "Sì" : "No",
      user.note || "",
    ]);

    // Escape and format
    const escapeCsv = (value: string) => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `iscritti_${timestamp}.csv`;

    return { csv: csvContent, filename };
  }

  async getDashboardStatistics(requestingUser: User): Promise<{
    totalUsers: number;
    byRole: { pilot: number; cabin_crew: number };
    byBase: { base: string; count: number }[];
    byContract: { contract: string; count: number }[];
    recentRegistrations: number;
    itudCount: number;
    rsaCount: number;
  }> {
    // Build base query conditions
    const baseConditions: string[] = ["user.isActive = :isActive"];
    const parameters: any = { isActive: true };

    // Admin scoping
    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      baseConditions.push("user.ruolo = :ruolo");
      parameters.ruolo = requestingUser.ruolo;
    }

    const whereClause = baseConditions.join(" AND ");

    // Total users
    const totalUsers = await this.usersRepository
      .createQueryBuilder("user")
      .where(whereClause, parameters)
      .getCount();

    // By role
    const pilotCount = await this.usersRepository
      .createQueryBuilder("user")
      .where(whereClause + " AND user.ruolo = :pilotRole", {
        ...parameters,
        pilotRole: Ruolo.PILOT,
      })
      .getCount();
    const ccCount = await this.usersRepository
      .createQueryBuilder("user")
      .where(whereClause + " AND user.ruolo = :ccRole", {
        ...parameters,
        ccRole: Ruolo.CABIN_CREW,
      })
      .getCount();

    // By base (top 10)
    const byBase = await this.usersRepository
      .createQueryBuilder("user")
      .select("base.nome", "base")
      .addSelect("COUNT(user.id)", "count")
      .leftJoin("user.base", "base")
      .where(whereClause, parameters)
      .groupBy("base.nome")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();

    // By contract (top 10)
    const byContract = await this.usersRepository
      .createQueryBuilder("user")
      .select("contratto.nome", "contract")
      .addSelect("COUNT(user.id)", "count")
      .leftJoin("user.contratto", "contratto")
      .where(whereClause, parameters)
      .groupBy("contratto.nome")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await this.usersRepository
      .createQueryBuilder("user")
      .where(whereClause + " AND user.createdAt >= :thirtyDaysAgo", {
        ...parameters,
        thirtyDaysAgo,
      })
      .getCount();

    // ITUD and RSA counts
    const itudCount = await this.usersRepository
      .createQueryBuilder("user")
      .where(whereClause + " AND user.itud = :itud", {
        ...parameters,
        itud: true,
      })
      .getCount();
    const rsaCount = await this.usersRepository
      .createQueryBuilder("user")
      .where(whereClause + " AND user.rsa = :rsa", { ...parameters, rsa: true })
      .getCount();

    return {
      totalUsers,
      byRole: { pilot: pilotCount, cabin_crew: ccCount },
      byBase: byBase.map((b) => ({
        base: b.base || "N/A",
        count: parseInt(b.count),
      })),
      byContract: byContract.map((c) => ({
        contract: c.contract || "N/A",
        count: parseInt(c.count),
      })),
      recentRegistrations,
      itudCount,
      rsaCount,
    };
  }

  async bulkImport(
    fileBuffer: Buffer,
    fileExtension: string,
    requestingUser: User,
    overrideRuolo?: Ruolo,
  ): Promise<{
    created: number;
    errors: { row: number; error: string }[];
    total: number;
  }> {
    let records: Record<string, string>[] = [];

    // Parse file based on extension
    if (fileExtension === ".csv") {
      records = parse(fileBuffer.toString(), {
        columns: true,
        skip_empty_lines: true,
      }) as Record<string, string>[];
    } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
      const workbook = xlsx.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as any[][];

      // Convert array to object format (first row is headers)
      if (rawData.length > 0) {
        const headers = rawData[0] as string[];
        records = rawData.slice(1).map((row: any[]) => {
          const obj: Record<string, string> = {};
          headers.forEach((header, index) => {
            obj[header] = String(row[index] || "");
          });
          return obj;
        });
      }
    } else {
      throw new Error(
        "Unsupported file format. Use CSV or Excel (.xlsx, .xls)",
      );
    }

    const results = {
      created: 0,
      errors: [] as { row: number; error: string }[],
      total: records.length,
    };

    // Get all bases, contracts, grades for matching by CODE
    const [bases, contracts, grades] = await Promise.all([
      this.usersRepository.manager.find("Base"),
      this.usersRepository.manager.find("Contract"),
      this.usersRepository.manager.find("Grade"),
    ]);

    // Determine default values based on admin role or override (for SuperAdmin)
    const adminRuolo = overrideRuolo || requestingUser.ruolo;
    const defaultContractCode =
      adminRuolo === Ruolo.CABIN_CREW ? "MAY-CC" : "MAY-PI";
    const defaultContract = contracts.find(
      (c: any) => c.codice === defaultContractCode,
    );

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because header is row 1

      try {
        // Map Excel columns to fields (handle different column names)
        const crewcode = record.CREWCODE || record.Crewcode || record.crewcode;
        const surname = record.SURNAME || record.Cognome || record.cognome;
        const name = record.NAME || record.Nome || record.nome;
        const email = record.EMAIL || record.Email || record.email;
        const phone =
          record.PHONE ||
          record.Telefono ||
          record.telefono ||
          record.PHONE?.toString();
        const baseCode = record.BASE || record.Base || record.base;
        const gradeCode =
          record.GRADE || record.Grade || record.grade || record.QUALIFICA;
        const note = record.NOTE || record.Note || record.note;

        // Validate required fields
        if (!crewcode || !surname || !name || !email) {
          results.errors.push({
            row: rowNumber,
            error: `Missing required fields. Got: CREWCODE=${crewcode}, SURNAME=${surname}, NAME=${name}, EMAIL=${email}`,
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await this.usersRepository.findOne({
          where: [
            { crewcode: crewcode.toUpperCase() },
            { email: email.toLowerCase() },
          ],
        });

        if (existingUser) {
          results.errors.push({
            row: rowNumber,
            error: `User with crewcode ${crewcode} or email ${email} already exists`,
          });
          continue;
        }

        // Match base and grade by CODE (not name)
        const base = bases.find(
          (b: any) => b.codice.toUpperCase() === (baseCode || "").toUpperCase(),
        );
        const grade = grades.find(
          (g: any) =>
            g.codice.toUpperCase() === (gradeCode || "").toUpperCase(),
        );

        // Determine ruolo: use override (SuperAdmin), grade, or admin role
        let ruolo: Ruolo | null | undefined = adminRuolo;
        if (grade) {
          ruolo = grade.ruolo;
        }

        // Admin scoping check
        if (requestingUser.role === UserRole.ADMIN) {
          if (ruolo && ruolo !== requestingUser.ruolo) {
            results.errors.push({
              row: rowNumber,
              error: "Cannot create user with different professional role",
            });
            continue;
          }
          ruolo = requestingUser.ruolo || ruolo;
        }

        // SuperAdmin with override: validate the role matches
        if (requestingUser.role === UserRole.SUPERADMIN && overrideRuolo) {
          if (ruolo && ruolo !== overrideRuolo) {
            results.errors.push({
              row: rowNumber,
              error: `Grade ${gradeCode} is for ${ruolo}, but you selected ${overrideRuolo}`,
            });
            continue;
          }
          ruolo = overrideRuolo;
        }

        // Determine contract based on ruolo
        const contract =
          ruolo === Ruolo.CABIN_CREW
            ? contracts.find((c: any) => c.codice === "MAY-CC") ||
              defaultContract
            : contracts.find((c: any) => c.codice === "MAY-PI") ||
              defaultContract;

        // Create user
        const hashedPassword = await bcrypt.hash("password", 10);
        const user = this.usersRepository.create({
          crewcode: crewcode.toUpperCase(),
          nome: name,
          cognome: surname,
          email: email.toLowerCase(),
          telefono: phone || null,
          ruolo,
          baseId: base?.id || null,
          contrattoId: contract?.id || null,
          gradeId: grade?.id || null,
          password: hashedPassword,
          mustChangePassword: true,
          isActive: true,
          itud: false, // Default false
          rsa: false, // Default false
          rls: false, // Default false
          note: note || null,
          dataIscrizione: null, // Empty for now
        });

        await this.usersRepository.save(user);

        // Create status history
        await this.statusHistoryRepository.save({
          userId: user.id,
          changeType: StatusChangeType.ACTIVATION,
          reason: "User imported via bulk upload",
          changedById: requestingUser.id,
        });

        results.created++;
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          error: error.message || "Unknown error",
        });
      }
    }

    return results;
  }

  private async getRsaRlsContacts(): Promise<RsaRlsContact[]> {
    const users = await this.usersRepository
      .createQueryBuilder("user")
      .select([
        "user.nome",
        "user.cognome",
        "user.telefono",
        "user.rsa",
        "user.rls",
      ])
      .where("user.isActive = true AND (user.rsa = true OR user.rls = true)")
      .getMany();

    return users.map((u) => ({
      nome: u.nome,
      cognome: u.cognome,
      telefono: u.telefono ?? null,
      isRsa: u.rsa === true,
      isRls: u.rls === true,
    }));
  }

  async getPayslipSettings(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ["id", "payslipSettings"],
    });
    if (!user) throw new NotFoundException("User not found");
    return user.payslipSettings ?? null;
  }

  async updatePayslipSettings(
    userId: string,
    settings: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    await this.usersRepository.query(
      `UPDATE "users" SET "payslipSettings" = $1 WHERE "id" = $2`,
      [JSON.stringify(settings), userId],
    );
    return settings;
  }

  async sendTestWelcomeEmail(): Promise<{
    sent: boolean;
    to: string;
    crewcode: string;
  }> {
    const users = await this.usersRepository.find({
      where: { isActive: true },
      take: 50,
    });
    if (users.length === 0) {
      throw new NotFoundException("No active users found");
    }
    const user = users[Math.floor(Math.random() * users.length)];
    const contacts = await this.getRsaRlsContacts();
    await this.mailService.sendWelcomeEmail(user, "password", contacts);
    return { sent: true, to: user.email, crewcode: user.crewcode };
  }

  async sendTestRegistrationFormEmail(): Promise<{
    sent: boolean;
    to: string;
    crewcode: string;
  }> {
    const users = await this.usersRepository.find({
      where: { isActive: true },
      take: 50,
    });
    if (users.length === 0)
      throw new NotFoundException("No active users found");
    const user = users[Math.floor(Math.random() * users.length)];
    // Minimal valid PDF placeholder for testing
    const pdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
        "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
        "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n" +
        "xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n9\n%%EOF",
    );
    await this.mailService.sendRegistrationFormToSecretary(
      user,
      pdfBuffer,
      `modulo_iscrizione_${user.crewcode}_TEST.pdf`,
    );
    return { sent: true, to: user.email, crewcode: user.crewcode };
  }
}
