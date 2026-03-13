"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const sync_1 = require("csv-parse/sync");
const xlsx = __importStar(require("xlsx"));
const user_entity_1 = require("./entities/user.entity");
const user_status_history_entity_1 = require("./entities/user-status-history.entity");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const ruolo_enum_1 = require("../common/enums/ruolo.enum");
let UsersService = class UsersService {
    constructor(usersRepository, statusHistoryRepository) {
        this.usersRepository = usersRepository;
        this.statusHistoryRepository = statusHistoryRepository;
    }
    addStatusLogEntry(user, isActive, reason, performedById) {
        const entry = {
            isActive,
            timestamp: new Date().toISOString(),
            reason,
            performedBy: performedById,
        };
        if (!user.statusLog) {
            user.statusLog = [];
        }
        user.statusLog.push(entry);
        if (user.statusLog.length > 10) {
            user.statusLog = user.statusLog.slice(-10);
        }
    }
    async findAll(options, requestingUser) {
        const { role, ruolo, baseId, contrattoId, gradeId, isActive, search, page = 1, perPage = 20, } = options;
        const where = {};
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN && requestingUser.ruolo) {
            where.ruolo = requestingUser.ruolo;
        }
        if (role && requestingUser.role === user_role_enum_1.UserRole.SUPERADMIN) {
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
        const queryBuilder = this.usersRepository
            .createQueryBuilder("user")
            .leftJoinAndSelect("user.base", "base")
            .leftJoinAndSelect("user.contratto", "contratto")
            .leftJoinAndSelect("user.grade", "grade")
            .where(where)
            .andWhere("user.deactivatedAt IS NULL")
            .andWhere("user.isActive = :isActive", {
            isActive: isActive !== undefined ? isActive : true,
        })
            .orderBy("user.cognome", "ASC")
            .addOrderBy("user.nome", "ASC")
            .skip((page - 1) * perPage)
            .take(perPage);
        if (search) {
            queryBuilder.andWhere(new typeorm_2.Brackets((qb) => {
                qb.where("user.nome ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.cognome ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.crewcode ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.email ILIKE :search", { search: `%${search}%` });
            }));
        }
        const [data, total] = await queryBuilder.getManyAndCount();
        return {
            data,
            total,
            page,
            perPage,
        };
    }
    async findById(id, includeDeactivated = false) {
        const where = { id };
        if (!includeDeactivated) {
            where.deactivatedAt = null;
        }
        const user = await this.usersRepository.findOne({
            where,
            relations: ["base", "contratto", "grade"],
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return user;
    }
    async findByCrewcode(crewcode, includeDeleted = false) {
        const query = this.usersRepository
            .createQueryBuilder("user")
            .where("user.crewcode = :crewcode", { crewcode: crewcode.toUpperCase() })
            .leftJoinAndSelect("user.base", "base")
            .leftJoinAndSelect("user.contratto", "contratto")
            .leftJoinAndSelect("user.grade", "grade");
        if (!includeDeleted) {
            query.andWhere("user.deactivatedAt IS NULL");
        }
        return query.getOne();
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({
            where: { email: email.toLowerCase() },
        });
    }
    async create(createUserDto, requestingUser) {
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN) {
            if (createUserDto.ruolo && createUserDto.ruolo !== requestingUser.ruolo) {
                throw new common_1.ForbiddenException("Admin can only create users of their own professional role");
            }
            if (createUserDto.role && createUserDto.role !== user_role_enum_1.UserRole.USER) {
                throw new common_1.ForbiddenException("Admin can only create regular users");
            }
        }
        const existingEmail = await this.findByEmail(createUserDto.email);
        if (existingEmail) {
            throw new common_1.ConflictException("Email already exists");
        }
        const existingCrewcode = await this.findByCrewcode(createUserDto.crewcode, true);
        if (existingCrewcode) {
            if (existingCrewcode.deactivatedAt) {
                return this.reactivateUser(existingCrewcode, createUserDto, requestingUser);
            }
            else {
                throw new common_1.ConflictException("Crewcode already exists");
            }
        }
        const hashedPassword = await bcrypt.hash("password", 10);
        let dataIscrizione = createUserDto.dataIscrizione;
        if (dataIscrizione) {
            const parts = dataIscrizione.split("/");
            if (parts.length === 3) {
                dataIscrizione = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        const user = this.usersRepository.create({
            ...createUserDto,
            crewcode: createUserDto.crewcode.toUpperCase(),
            email: createUserDto.email.toLowerCase(),
            dataIscrizione,
            password: hashedPassword,
            mustChangePassword: true,
            isActive: true,
        });
        this.addStatusLogEntry(user, true, "User created", requestingUser.id);
        const savedUser = await this.usersRepository.save(user);
        await this.statusHistoryRepository.save({
            userId: savedUser.id,
            changeType: user_status_history_entity_1.StatusChangeType.ACTIVATION,
            reason: "User created",
            changedById: requestingUser.id,
        });
        return savedUser;
    }
    async reactivateUser(existingUser, createUserDto, requestingUser) {
        const hashedPassword = await bcrypt.hash("password", 10);
        let dataIscrizione = createUserDto.dataIscrizione;
        if (dataIscrizione) {
            const parts = dataIscrizione.split("/");
            if (parts.length === 3) {
                dataIscrizione = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        Object.assign(existingUser, {
            ...createUserDto,
            crewcode: createUserDto.crewcode.toUpperCase(),
            email: createUserDto.email.toLowerCase(),
            dataIscrizione,
            password: hashedPassword,
            mustChangePassword: true,
            isActive: true,
            deactivatedAt: null,
        });
        this.addStatusLogEntry(existingUser, true, "User re-registered with same crewcode (previously deactivated)", requestingUser.id);
        const savedUser = await this.usersRepository.save(existingUser);
        await this.statusHistoryRepository.save({
            userId: savedUser.id,
            changeType: user_status_history_entity_1.StatusChangeType.REACTIVATION,
            reason: "User re-registered with same crewcode (previously deactivated)",
            changedById: requestingUser.id,
        });
        return savedUser;
    }
    async update(id, updateUserDto, requestingUser) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN) {
            if (user.ruolo !== requestingUser.ruolo) {
                throw new common_1.ForbiddenException("Admin can only edit users of their own professional role");
            }
            if (updateUserDto.role && updateUserDto.role !== user_role_enum_1.UserRole.USER) {
                throw new common_1.ForbiddenException("Admin cannot assign admin privileges");
            }
        }
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingEmail = await this.findByEmail(updateUserDto.email);
            if (existingEmail) {
                throw new common_1.ConflictException("Email already exists");
            }
        }
        if (updateUserDto.crewcode &&
            updateUserDto.crewcode.toUpperCase() !== user.crewcode) {
            const existingCrewcode = await this.findByCrewcode(updateUserDto.crewcode, true);
            if (existingCrewcode && !existingCrewcode.deactivatedAt) {
                throw new common_1.ConflictException("Crewcode already exists");
            }
        }
        const oldIsActive = user.isActive;
        if (updateUserDto.email) {
            updateUserDto.email = updateUserDto.email.toLowerCase();
        }
        if (updateUserDto.crewcode) {
            updateUserDto.crewcode = updateUserDto.crewcode.toUpperCase();
        }
        if (updateUserDto.dataIscrizione) {
            const parts = updateUserDto.dataIscrizione.split("/");
            if (parts.length === 3) {
                updateUserDto.dataIscrizione = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        Object.assign(user, updateUserDto);
        if (updateUserDto.isActive !== undefined &&
            updateUserDto.isActive !== oldIsActive) {
            this.addStatusLogEntry(user, updateUserDto.isActive, updateUserDto.isActive ? "User activated" : "User deactivated", requestingUser.id);
        }
        const savedUser = await this.usersRepository.save(user);
        if (updateUserDto.isActive !== undefined &&
            updateUserDto.isActive !== oldIsActive) {
            await this.statusHistoryRepository.save({
                userId: savedUser.id,
                changeType: updateUserDto.isActive
                    ? user_status_history_entity_1.StatusChangeType.ACTIVATION
                    : user_status_history_entity_1.StatusChangeType.DEACTIVATION,
                reason: updateUserDto.isActive ? "User activated" : "User deactivated",
                changedById: requestingUser.id,
            });
        }
        return savedUser;
    }
    async remove(id, requestingUser) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN) {
            if (user.ruolo !== requestingUser.ruolo) {
                throw new common_1.ForbiddenException("Admin can only delete users of their own professional role");
            }
            if (user.role !== user_role_enum_1.UserRole.USER) {
                throw new common_1.ForbiddenException("Admin cannot delete admin users");
            }
        }
        user.isActive = false;
        user.deactivatedAt = new Date();
        this.addStatusLogEntry(user, false, "User deactivated (soft delete)", requestingUser.id);
        await this.usersRepository.save(user);
        await this.statusHistoryRepository.save({
            userId: id,
            changeType: user_status_history_entity_1.StatusChangeType.DEACTIVATION,
            reason: "User deactivated (soft delete)",
            changedById: requestingUser.id,
        });
    }
    async updatePassword(userId, hashedPassword) {
        await this.usersRepository.update(userId, { password: hashedPassword });
    }
    async updateMustChangePassword(userId, mustChange) {
        await this.usersRepository.update(userId, {
            mustChangePassword: mustChange,
        });
    }
    async countByRole(ruolo) {
        return this.usersRepository.count({
            where: { ruolo, isActive: true, deactivatedAt: (0, typeorm_2.IsNull)() },
        });
    }
    async getRecentUsers(limit = 5, requestingUser) {
        const where = { isActive: true, deactivatedAt: (0, typeorm_2.IsNull)() };
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN && requestingUser.ruolo) {
            where.ruolo = requestingUser.ruolo;
        }
        return this.usersRepository.find({
            where,
            relations: ["base", "contratto", "grade"],
            order: { createdAt: "DESC" },
            take: limit,
        });
    }
    async getStatusHistory(userId, requestingUser) {
        const user = await this.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN &&
            user.ruolo !== requestingUser.ruolo) {
            throw new common_1.ForbiddenException("Admin can only view history of their own professional role");
        }
        return this.statusHistoryRepository.find({
            where: { userId },
            relations: ["performedBy"],
            order: { createdAt: "DESC" },
        });
    }
    async findAllDeactivated(options, requestingUser) {
        if (requestingUser.role !== user_role_enum_1.UserRole.SUPERADMIN) {
            throw new common_1.ForbiddenException("Only SuperAdmin can access deactivated users");
        }
        const { search, page = 1, perPage = 20 } = options;
        const queryBuilder = this.usersRepository
            .createQueryBuilder("user")
            .leftJoinAndSelect("user.base", "base")
            .leftJoinAndSelect("user.contratto", "contratto")
            .leftJoinAndSelect("user.grade", "grade")
            .where("user.isActive = false")
            .orderBy("user.cognome", "ASC")
            .skip((page - 1) * perPage)
            .take(perPage);
        if (search) {
            queryBuilder.andWhere(new typeorm_2.Brackets((qb) => {
                qb.where("user.nome ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.cognome ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.crewcode ILIKE :search", { search: `%${search}%` })
                    .orWhere("user.email ILIKE :search", { search: `%${search}%` });
            }));
        }
        const [data, total] = await queryBuilder.getManyAndCount();
        return {
            data,
            total,
            page,
            perPage,
        };
    }
    async reactivateDeactivatedUser(id, requestingUser) {
        if (requestingUser.role !== user_role_enum_1.UserRole.SUPERADMIN) {
            throw new common_1.ForbiddenException("Only SuperAdmin can reactivate users");
        }
        const user = await this.usersRepository.findOne({
            where: { id },
            relations: ["base", "contratto", "grade"],
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        if (!user.deactivatedAt) {
            throw new common_1.ConflictException("User is not deactivated");
        }
        user.isActive = true;
        user.deactivatedAt = null;
        user.mustChangePassword = true;
        this.addStatusLogEntry(user, true, "User reactivated by SuperAdmin", requestingUser.id);
        const savedUser = await this.usersRepository.save(user);
        await this.statusHistoryRepository.save({
            userId: savedUser.id,
            changeType: user_status_history_entity_1.StatusChangeType.REACTIVATION,
            reason: "User reactivated by SuperAdmin",
            changedById: requestingUser.id,
        });
        return savedUser;
    }
    async permanentlyDelete(id, requestingUser) {
        if (requestingUser.role !== user_role_enum_1.UserRole.SUPERADMIN) {
            throw new common_1.ForbiddenException("Only SuperAdmin can permanently delete users");
        }
        const user = await this.usersRepository.findOne({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        if (!user.deactivatedAt) {
            throw new common_1.ConflictException("Only deactivated users can be permanently deleted");
        }
        await this.statusHistoryRepository.delete({ userId: id });
        await this.usersRepository.delete(id);
    }
    async exportToCsv(options, requestingUser) {
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN && requestingUser.ruolo) {
            options.ruolo = requestingUser.ruolo;
        }
        const where = { isActive: true, deactivatedAt: (0, typeorm_2.IsNull)() };
        if (options.ruolo)
            where.ruolo = options.ruolo;
        if (options.baseId)
            where.baseId = options.baseId;
        if (options.contrattoId)
            where.contrattoId = options.contrattoId;
        const users = await this.usersRepository.find({
            where,
            relations: ['base', 'contratto', 'grade'],
            order: { cognome: 'ASC', nome: 'ASC' },
        });
        const headers = [
            'Crewcode',
            'Nome',
            'Cognome',
            'Email',
            'Telefono',
            'Ruolo',
            'Base',
            'Contratto',
            'Qualifica',
            'Data Iscrizione',
            'ITUD',
            'RSA',
            'Note',
        ];
        const rows = users.map((user) => [
            user.crewcode,
            user.nome,
            user.cognome,
            user.email,
            user.telefono || '',
            user.ruolo || '',
            user.base?.nome || '',
            user.contratto?.nome || '',
            user.grade?.nome || '',
            user.dataIscrizione || '',
            user.itud ? 'Sì' : 'No',
            user.rsa ? 'Sì' : 'No',
            user.note || '',
        ]);
        const escapeCsv = (value) => {
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map(escapeCsv).join(',')),
        ].join('\n');
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `iscritti_${timestamp}.csv`;
        return { csv: csvContent, filename };
    }
    async getDashboardStatistics(requestingUser) {
        const baseConditions = ['user.isActive = :isActive', 'user.deactivatedAt IS NULL'];
        const parameters = { isActive: true };
        if (requestingUser.role === user_role_enum_1.UserRole.ADMIN && requestingUser.ruolo) {
            baseConditions.push('user.ruolo = :ruolo');
            parameters.ruolo = requestingUser.ruolo;
        }
        const whereClause = baseConditions.join(' AND ');
        const totalUsers = await this.usersRepository
            .createQueryBuilder('user')
            .where(whereClause, parameters)
            .getCount();
        const pilotCount = await this.usersRepository
            .createQueryBuilder('user')
            .where(whereClause + ' AND user.ruolo = :pilotRole', { ...parameters, pilotRole: ruolo_enum_1.Ruolo.PILOT })
            .getCount();
        const ccCount = await this.usersRepository
            .createQueryBuilder('user')
            .where(whereClause + ' AND user.ruolo = :ccRole', { ...parameters, ccRole: ruolo_enum_1.Ruolo.CABIN_CREW })
            .getCount();
        const byBase = await this.usersRepository
            .createQueryBuilder('user')
            .select('base.nome', 'base')
            .addSelect('COUNT(user.id)', 'count')
            .leftJoin('user.base', 'base')
            .where(whereClause, parameters)
            .groupBy('base.nome')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();
        const byContract = await this.usersRepository
            .createQueryBuilder('user')
            .select('contratto.nome', 'contract')
            .addSelect('COUNT(user.id)', 'count')
            .leftJoin('user.contratto', 'contratto')
            .where(whereClause, parameters)
            .groupBy('contratto.nome')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentRegistrations = await this.usersRepository
            .createQueryBuilder('user')
            .where(whereClause + ' AND user.createdAt >= :thirtyDaysAgo', {
            ...parameters,
            thirtyDaysAgo
        })
            .getCount();
        const itudCount = await this.usersRepository
            .createQueryBuilder('user')
            .where(whereClause + ' AND user.itud = :itud', { ...parameters, itud: true })
            .getCount();
        const rsaCount = await this.usersRepository
            .createQueryBuilder('user')
            .where(whereClause + ' AND user.rsa = :rsa', { ...parameters, rsa: true })
            .getCount();
        return {
            totalUsers,
            byRole: { pilot: pilotCount, cabin_crew: ccCount },
            byBase: byBase.map((b) => ({ base: b.base || 'N/A', count: parseInt(b.count) })),
            byContract: byContract.map((c) => ({ contract: c.contract || 'N/A', count: parseInt(c.count) })),
            recentRegistrations,
            itudCount,
            rsaCount,
        };
    }
    async bulkImport(fileBuffer, fileExtension, requestingUser, overrideRuolo) {
        let records = [];
        if (fileExtension === '.csv') {
            records = (0, sync_1.parse)(fileBuffer.toString(), {
                columns: true,
                skip_empty_lines: true,
            });
        }
        else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            if (rawData.length > 0) {
                const headers = rawData[0];
                records = rawData.slice(1).map((row) => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = String(row[index] || '');
                    });
                    return obj;
                });
            }
        }
        else {
            throw new Error('Unsupported file format. Use CSV or Excel (.xlsx, .xls)');
        }
        const results = {
            created: 0,
            errors: [],
            total: records.length,
        };
        const [bases, contracts, grades] = await Promise.all([
            this.usersRepository.manager.find('Base'),
            this.usersRepository.manager.find('Contract'),
            this.usersRepository.manager.find('Grade'),
        ]);
        const adminRuolo = overrideRuolo || requestingUser.ruolo;
        const defaultContractCode = adminRuolo === ruolo_enum_1.Ruolo.CABIN_CREW ? 'MAY-CC' : 'MAY-PI';
        const defaultContract = contracts.find((c) => c.codice === defaultContractCode);
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNumber = i + 2;
            try {
                const crewcode = record.CREWCODE || record.Crewcode || record.crewcode;
                const surname = record.SURNAME || record.Cognome || record.cognome;
                const name = record.NAME || record.Nome || record.nome;
                const email = record.EMAIL || record.Email || record.email;
                const phone = record.PHONE || record.Telefono || record.telefono || record.PHONE?.toString();
                const baseCode = record.BASE || record.Base || record.base;
                const gradeCode = record.GRADE || record.Grade || record.grade || record.QUALIFICA;
                const note = record.NOTE || record.Note || record.note;
                if (!crewcode || !surname || !name || !email) {
                    results.errors.push({
                        row: rowNumber,
                        error: `Missing required fields. Got: CREWCODE=${crewcode}, SURNAME=${surname}, NAME=${name}, EMAIL=${email}`,
                    });
                    continue;
                }
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
                const base = bases.find((b) => b.codice.toUpperCase() === (baseCode || '').toUpperCase());
                const grade = grades.find((g) => g.codice.toUpperCase() === (gradeCode || '').toUpperCase());
                let ruolo = adminRuolo;
                if (grade) {
                    ruolo = grade.ruolo;
                }
                if (requestingUser.role === user_role_enum_1.UserRole.ADMIN) {
                    if (ruolo && ruolo !== requestingUser.ruolo) {
                        results.errors.push({
                            row: rowNumber,
                            error: 'Cannot create user with different professional role',
                        });
                        continue;
                    }
                    ruolo = requestingUser.ruolo || ruolo;
                }
                if (requestingUser.role === user_role_enum_1.UserRole.SUPERADMIN && overrideRuolo) {
                    if (ruolo && ruolo !== overrideRuolo) {
                        results.errors.push({
                            row: rowNumber,
                            error: `Grade ${gradeCode} is for ${ruolo}, but you selected ${overrideRuolo}`,
                        });
                        continue;
                    }
                    ruolo = overrideRuolo;
                }
                const contract = ruolo === ruolo_enum_1.Ruolo.CABIN_CREW
                    ? contracts.find((c) => c.codice === 'MAY-CC') || defaultContract
                    : contracts.find((c) => c.codice === 'MAY-PI') || defaultContract;
                const hashedPassword = await bcrypt.hash('password', 10);
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
                    itud: false,
                    rsa: false,
                    note: note || null,
                    dataIscrizione: null,
                });
                await this.usersRepository.save(user);
                await this.statusHistoryRepository.save({
                    userId: user.id,
                    changeType: user_status_history_entity_1.StatusChangeType.ACTIVATION,
                    reason: 'User imported via bulk upload',
                    changedById: requestingUser.id,
                });
                results.created++;
            }
            catch (error) {
                results.errors.push({
                    row: rowNumber,
                    error: error.message || 'Unknown error',
                });
            }
        }
        return results;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_status_history_entity_1.UserStatusHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map