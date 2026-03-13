import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { UserStatusHistory } from "./entities/user-status-history.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
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
export declare class UsersService {
    private usersRepository;
    private statusHistoryRepository;
    constructor(usersRepository: Repository<User>, statusHistoryRepository: Repository<UserStatusHistory>);
    private addStatusLogEntry;
    findAll(options: FindAllOptions, requestingUser: User): Promise<{
        data: User[];
        total: number;
        page: number;
        perPage: number;
    }>;
    findById(id: string, includeDeactivated?: boolean): Promise<User>;
    findByCrewcode(crewcode: string, includeDeleted?: boolean): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(createUserDto: CreateUserDto, requestingUser: User): Promise<User>;
    private reactivateUser;
    update(id: string, updateUserDto: UpdateUserDto, requestingUser: User): Promise<User>;
    remove(id: string, requestingUser: User): Promise<void>;
    updatePassword(userId: string, hashedPassword: string): Promise<void>;
    updateMustChangePassword(userId: string, mustChange: boolean): Promise<void>;
    countByRole(ruolo: Ruolo): Promise<number>;
    getRecentUsers(limit: number | undefined, requestingUser: User): Promise<User[]>;
    getStatusHistory(userId: string, requestingUser: User): Promise<UserStatusHistory[]>;
    findAllDeactivated(options: {
        search?: string;
        page?: number;
        perPage?: number;
    }, requestingUser: User): Promise<{
        data: User[];
        total: number;
        page: number;
        perPage: number;
    }>;
    reactivateDeactivatedUser(id: string, requestingUser: User): Promise<User>;
    permanentlyDelete(id: string, requestingUser: User): Promise<void>;
    exportToCsv(options: {
        ruolo?: Ruolo;
        baseId?: string;
        contrattoId?: string;
    }, requestingUser: User): Promise<{
        csv: string;
        filename: string;
    }>;
    getDashboardStatistics(requestingUser: User): Promise<{
        totalUsers: number;
        byRole: {
            pilot: number;
            cabin_crew: number;
        };
        byBase: {
            base: string;
            count: number;
        }[];
        byContract: {
            contract: string;
            count: number;
        }[];
        recentRegistrations: number;
        itudCount: number;
        rsaCount: number;
    }>;
    bulkImport(fileBuffer: Buffer, fileExtension: string, requestingUser: User, overrideRuolo?: Ruolo): Promise<{
        created: number;
        errors: {
            row: number;
            error: string;
        }[];
        total: number;
    }>;
}
export {};
