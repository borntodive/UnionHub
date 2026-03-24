import * as fs from "fs";
import * as path from "path";
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UsersService } from "./users.service";
import { MailService } from "../mail/mail.service";
import { PdfExtractionService } from "./services/pdf-extraction.service";
import { FileStorageService } from "./services/file-storage.service";
import { PdfImageService } from "./services/pdf-image.service";
import { BasesService } from "../bases/bases.service";
import { ContractsService } from "../contracts/contracts.service";
import { GradesService } from "../grades/grades.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User } from "./entities/user.entity";
import { Ruolo } from "../common/enums/ruolo.enum";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: UserRole;
    ruolo: Ruolo | null;
  };
}

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly pdfExtractionService: PdfExtractionService,
    private readonly fileStorageService: FileStorageService,
    private readonly pdfImageService: PdfImageService,
    private readonly basesService: BasesService,
    private readonly contractsService: ContractsService,
    private readonly gradesService: GradesService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(
    @Request() req: RequestWithUser,
    @Query("role") role?: UserRole,
    @Query("ruolo") ruolo?: Ruolo,
    @Query("baseId") baseId?: string,
    @Query("contrattoId") contrattoId?: string,
    @Query("gradeId") gradeId?: string,
    @Query("isActive") isActive?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);

    return this.usersService.findAll(
      {
        role,
        ruolo,
        baseId,
        contrattoId,
        gradeId,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        search,
        page: page ? parseInt(page, 10) : 1,
        perPage: perPage ? parseInt(perPage, 10) : 20,
      },
      requestingUser,
    );
  }

  @Get("me")
  async getMe(@Request() req: RequestWithUser): Promise<Partial<User>> {
    const user = await this.usersService.findById(req.user.userId);
    return user.serialize(user.role);
  }

  @Patch("me")
  async updateMe(
    @Request() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Partial<User>> {
    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.update(
      req.user.userId,
      updateUserDto,
      requestingUser,
    );
    return user.serialize(user.role);
  }

  @Get("recent")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getRecentUsers(
    @Request() req: RequestWithUser,
    @Query("limit") limit?: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);

    return this.usersService.getRecentUsers(
      limit ? parseInt(limit, 10) : 5,
      requestingUser,
    );
  }

  @Get("count-by-role")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async countByRole(@Query("ruolo") ruolo: Ruolo) {
    const count = await this.usersService.countByRole(ruolo);
    return { ruolo, count };
  }

  @Get(":id")
  async findOne(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Partial<User> | null> {
    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.findById(id);

    // Users can only view their own profile
    if (requestingUser.role === UserRole.USER && requestingUser.id !== id) {
      return null;
    }

    // Admin can only view users of their own role
    if (
      requestingUser.role === UserRole.ADMIN &&
      requestingUser.ruolo &&
      user.ruolo !== requestingUser.ruolo
    ) {
      return null;
    }

    return user.serialize(requestingUser.role);
  }

  @Post("debug/test-welcome-email")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async testWelcomeEmail() {
    return this.usersService.sendTestWelcomeEmail();
  }

  @Post("debug/test-registration-form-email")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async testRegistrationFormEmail() {
    return this.usersService.sendTestRegistrationFormEmail();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(
    @Request() req: RequestWithUser,
    @Body() createUserDto: CreateUserDto,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.create(createUserDto, requestingUser);
    return user.serialize(requestingUser.role);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.update(
      id,
      updateUserDto,
      requestingUser,
    );
    return user.serialize(requestingUser.role);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    await this.usersService.remove(id, requestingUser);
  }

  @Post("extract-pdf")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(
    FileInterceptor("pdf", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  )
  async extractPdf(
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body("role") role: Ruolo,
  ) {
    if (!file) {
      return {
        crewcode: "",
        nome: "",
        cognome: "",
        email: "",
        telefono: "",
        baseId: "",
        contrattoId: "",
        gradeId: "",
        confidence: 0,
        extractionMethod: "manual",
        rawFields: {},
      };
    }

    try {
      // Extract data from PDF form fields
      const extracted = await this.pdfExtractionService.extractFromPdf(
        file.buffer,
        role || Ruolo.PILOT,
      );

      // Get all entities for matching
      const [bases, contracts, grades] = await Promise.all([
        this.basesService.findAll(),
        this.contractsService.findAll(),
        this.gradesService.findAll(),
      ]);

      // Match extracted text values to entity IDs
      const matched = this.pdfExtractionService.matchToEntities(
        extracted,
        bases.map((b) => ({ id: b.id, codice: b.codice, nome: b.nome })),
        contracts.map((c) => ({ id: c.id, codice: c.codice, nome: c.nome })),
        grades.map((g) => ({ id: g.id, codice: g.codice, nome: g.nome })),
      );

      // Set default contract if not found (MAY-PI or MAY-CC)
      if (!matched.contrattoId) {
        const defaultContract = contracts.find((c) =>
          role === Ruolo.CABIN_CREW
            ? c.codice === "MAY-CC"
            : c.codice === "MAY-PI",
        );
        if (defaultContract) {
          matched.contrattoId = defaultContract.id;
        }
      }

      return matched;
    } catch (error) {
      console.error("PDF extraction error:", error);
      return {
        crewcode: "",
        nome: "",
        cognome: "",
        email: "",
        telefono: "",
        baseId: "",
        contrattoId: "",
        gradeId: "",
        confidence: 0,
        extractionMethod: "manual",
        rawFields: {},
      };
    }
  }

  @Post(":id/registration-form")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(
    FileInterceptor("pdf", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    }),
  )
  async uploadRegistrationForm(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No PDF file provided");
    }

    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Delete old file if exists
    if (user.registrationFormUrl) {
      await this.fileStorageService.deleteFile(user.registrationFormUrl);
    }

    // Save new file
    const { fileUrl } = await this.fileStorageService.savePdf(
      file.buffer,
      file.originalname,
      user.crewcode,
    );

    // Update user with new file URL
    const updated = await this.usersService.update(
      id,
      { registrationFormUrl: fileUrl },
      requestingUser,
    );

    // Notify secretary with the form attached (fire-and-forget)
    // Re-fetch with relations to ensure base/grade are populated for the email
    this.usersService
      .findById(id)
      .then((fullUser) =>
        this.mailService.sendRegistrationFormToSecretary(
          fullUser,
          file.buffer,
          file.originalname,
        ),
      )
      .catch((err) =>
        this.logger.error(
          `Secretary email failed for ${id}: ${err?.message ?? err}`,
        ),
      );

    return updated.serialize(requestingUser.role);
  }

  @Get(":id/registration-form")
  async getRegistrationForm(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("download") download?: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Users can only view their own PDF
    if (requestingUser.role === UserRole.USER && requestingUser.id !== id) {
      throw new ForbiddenException("Access denied");
    }

    // Admin can only view PDFs of users with the same role
    if (
      requestingUser.role === UserRole.ADMIN &&
      requestingUser.ruolo &&
      user.ruolo !== requestingUser.ruolo
    ) {
      throw new ForbiddenException("Access denied");
    }

    if (!user.registrationFormUrl) {
      throw new NotFoundException("No registration form found for this user");
    }

    const filePath = this.fileStorageService.getFilePathFromUrl(
      user.registrationFormUrl,
    );

    if (!this.fileStorageService.fileExists(user.registrationFormUrl)) {
      throw new NotFoundException("File not found");
    }

    return {
      fileUrl: user.registrationFormUrl,
      filePath,
      filename: filePath.split("/").pop(),
      download: download === "true",
    };
  }

  @Get(":id/registration-form/preview")
  async getRegistrationFormPreview(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Users can only view their own PDF preview
    if (requestingUser.role === UserRole.USER && requestingUser.id !== id) {
      throw new ForbiddenException("Access denied");
    }

    // Admin can only view PDFs of users with the same role
    if (
      requestingUser.role === UserRole.ADMIN &&
      requestingUser.ruolo &&
      user.ruolo !== requestingUser.ruolo
    ) {
      throw new ForbiddenException("Access denied");
    }

    if (!user.registrationFormUrl) {
      throw new NotFoundException("No registration form found for this user");
    }

    // Read PDF file — validate path stays within uploads directory
    const filePath = this.fileStorageService.getFilePathFromUrl(
      user.registrationFormUrl,
    );
    const uploadsDir = path.resolve("uploads");
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
      throw new ForbiddenException("Access denied");
    }

    if (!this.fileStorageService.fileExists(user.registrationFormUrl)) {
      throw new NotFoundException("File not found");
    }

    const pdfBuffer = await fs.promises.readFile(resolvedPath);

    // Convert first page to image
    const base64Image =
      await this.pdfImageService.convertFirstPageToImage(pdfBuffer);

    return {
      imageBase64: base64Image,
      mimeType: "image/png",
    };
  }

  @Post("convert-pdf-to-image")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async convertPdfToImage(@Body("pdfBase64") pdfBase64: string) {
    if (!pdfBase64) {
      throw new BadRequestException("No PDF data provided");
    }

    try {
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const base64Image =
        await this.pdfImageService.convertFirstPageToImage(pdfBuffer);

      return {
        imageBase64: base64Image,
        mimeType: "image/png",
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to convert PDF to image");
    }
  }

  // ==================== DEACTIVATED USERS MANAGEMENT (SUPERADMIN ONLY) ====================

  @Get("deactivated/list")
  @Roles(UserRole.SUPERADMIN)
  async findAllDeactivated(
    @Request() req: RequestWithUser,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);

    return this.usersService.findAllDeactivated(
      {
        search,
        page: page ? parseInt(page, 10) : 1,
        perPage: perPage ? parseInt(perPage, 10) : 20,
      },
      requestingUser,
    );
  }

  @Post("deactivated/:id/reactivate")
  @Roles(UserRole.SUPERADMIN)
  async reactivateDeactivatedUser(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    const user = await this.usersService.reactivateDeactivatedUser(
      id,
      requestingUser,
    );
    return user.serialize(requestingUser.role);
  }

  @Delete("deactivated/:id/permanent")
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async permanentlyDelete(
    @Request() req: RequestWithUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    await this.usersService.permanentlyDelete(id, requestingUser);
  }

  // ==================== EXPORT & STATISTICS ====================

  @Get("export/csv")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async exportToCsv(
    @Request() req: RequestWithUser,
    @Query("ruolo") ruolo?: Ruolo,
    @Query("baseId") baseId?: string,
    @Query("contrattoId") contrattoId?: string,
  ) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    return this.usersService.exportToCsv(
      { ruolo, baseId, contrattoId },
      requestingUser,
    );
  }

  @Get("statistics/dashboard")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getDashboardStatistics(@Request() req: RequestWithUser) {
    const requestingUser = await this.usersService.findById(req.user.userId);
    return this.usersService.getDashboardStatistics(requestingUser);
  }

  @Post("import/bulk")
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }),
  )
  async bulkImport(
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body("ruolo") ruolo?: Ruolo,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const requestingUser = await this.usersService.findById(req.user.userId);
    const fileExtension = file.originalname
      .substring(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (![".csv", ".xlsx", ".xls"].includes(fileExtension)) {
      throw new BadRequestException(
        "Unsupported file format. Use CSV or Excel (.xlsx, .xls)",
      );
    }

    return this.usersService.bulkImport(
      file.buffer,
      fileExtension,
      requestingUser,
      ruolo,
    );
  }
}
