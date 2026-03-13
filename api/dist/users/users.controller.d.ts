import { UsersService } from './users.service';
import { PdfExtractionService } from './services/pdf-extraction.service';
import { FileStorageService } from './services/file-storage.service';
import { PdfImageService } from './services/pdf-image.service';
import { BasesService } from '../bases/bases.service';
import { ContractsService } from '../contracts/contracts.service';
import { GradesService } from '../grades/grades.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Ruolo } from '../common/enums/ruolo.enum';
interface RequestWithUser extends Request {
    user: {
        userId: string;
        crewcode: string;
        role: UserRole;
        ruolo: Ruolo | null;
    };
}
export declare class UsersController {
    private readonly usersService;
    private readonly pdfExtractionService;
    private readonly fileStorageService;
    private readonly pdfImageService;
    private readonly basesService;
    private readonly contractsService;
    private readonly gradesService;
    constructor(usersService: UsersService, pdfExtractionService: PdfExtractionService, fileStorageService: FileStorageService, pdfImageService: PdfImageService, basesService: BasesService, contractsService: ContractsService, gradesService: GradesService);
    findAll(req: RequestWithUser, role?: UserRole, ruolo?: Ruolo, baseId?: string, contrattoId?: string, gradeId?: string, isActive?: string, search?: string, page?: string, perPage?: string): Promise<{
        data: User[];
        total: number;
        page: number;
        perPage: number;
    }>;
    getRecentUsers(req: RequestWithUser, limit?: string): Promise<User[]>;
    countByRole(ruolo: Ruolo): Promise<{
        ruolo: Ruolo;
        count: number;
    }>;
    findOne(req: RequestWithUser, id: string): Promise<Partial<User> | null>;
    create(req: RequestWithUser, createUserDto: CreateUserDto): Promise<Partial<User>>;
    update(req: RequestWithUser, id: string, updateUserDto: UpdateUserDto): Promise<Partial<User>>;
    remove(req: RequestWithUser, id: string): Promise<void>;
    extractPdf(req: RequestWithUser, file: Express.Multer.File, role: Ruolo): Promise<import("./services/pdf-extraction.service").ExtractedPdfData | {
        crewcode: string;
        nome: string;
        cognome: string;
        email: string;
        telefono: string;
        baseId: string;
        contrattoId: string;
        gradeId: string;
        confidence: number;
        extractionMethod: string;
        rawFields: {};
    }>;
    uploadRegistrationForm(req: RequestWithUser, id: string, file: Express.Multer.File): Promise<Partial<User>>;
    getRegistrationForm(req: RequestWithUser, id: string, download?: string): Promise<{
        fileUrl: string;
        filePath: string;
        filename: string | undefined;
        download: boolean;
    }>;
    getRegistrationFormPreview(req: RequestWithUser, id: string): Promise<{
        imageBase64: string;
        mimeType: string;
    }>;
    convertPdfToImage(pdfBase64: string): Promise<{
        imageBase64: string;
        mimeType: string;
    }>;
    findAllDeactivated(req: RequestWithUser, search?: string, page?: string, perPage?: string): Promise<{
        data: User[];
        total: number;
        page: number;
        perPage: number;
    }>;
    reactivateDeactivatedUser(req: RequestWithUser, id: string): Promise<Partial<User>>;
    permanentlyDelete(req: RequestWithUser, id: string): Promise<void>;
    exportToCsv(req: RequestWithUser, ruolo?: Ruolo, baseId?: string, contrattoId?: string): Promise<{
        csv: string;
        filename: string;
    }>;
    getDashboardStatistics(req: RequestWithUser): Promise<{
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
    bulkImport(req: RequestWithUser, file: Express.Multer.File, ruolo?: Ruolo): Promise<{
        created: number;
        errors: {
            row: number;
            error: string;
        }[];
        total: number;
    }>;
}
export {};
