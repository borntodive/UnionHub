import { UsersService } from './users.service';
import { PdfExtractionService } from './services/pdf-extraction.service';
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
    constructor(usersService: UsersService, pdfExtractionService: PdfExtractionService);
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
}
export {};
