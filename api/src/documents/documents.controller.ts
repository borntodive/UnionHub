import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  Response,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { DocumentsService } from "./documents.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  UpdateTranslationDto,
  UploadDocumentDto,
} from "./dto/create-document.dto";

/**
 * Sanitize document title for use as filename
 * Removes invalid characters and limits length
 */
function sanitizeFilename(title: string): string {
  if (!title) return "document";

  // Remove invalid characters for filenames: / \ : * ? " < > |
  let sanitized = title.replace(/[\/\\:*?"<>|]/g, "");

  // Replace newlines and multiple spaces with single underscore
  sanitized = sanitized.replace(/[\r\n]+/g, "_").replace(/\s+/g, "_");

  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, "_");

  // Remove leading/trailing underscores and dots
  sanitized = sanitized.replace(/^[_\.]+|[_\.]+$/g, "");

  // Limit length (255 chars max for most filesystems, leave room for .pdf)
  const maxLength = 200;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized || "document";
}

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: UserRole;
  };
}

/**
 * Documents Controller (Simplified)
 * Manage union communications with AI assistance
 * Workflow: Create → Process (AI+PDF) → Publish
 * ADMIN and SUPERADMIN access
 */
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll() {
    return this.documentsService.findAll();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(
    @Body() dto: CreateDocumentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.create(dto, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post("upload")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === "application/pdf") {
          cb(null, true);
        } else {
          cb(new BadRequestException("Only PDF files are allowed"), false);
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Request() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException("PDF file is required");
    }
    return this.documentsService.upload(dto, file, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  /**
   * Process document: AI rewrite + translate + generate PDF
   * All in one operation
   */
  @Post(":id/process")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async process(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.process(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(":id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async publish(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.publish(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, dto);
  }

  @Patch(":id/translation")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateTranslation(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTranslationDto,
  ) {
    return this.documentsService.updateTranslation(id, dto);
  }

  @Post(":id/regenerate-pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async regeneratePdf(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentsService.regeneratePdf(id);
  }

  @Post(":id/regenerate-ai")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async regenerateAi(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentsService.regenerateAi(id);
  }

  @Post(":id/translate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async translate(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentsService.translate(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    await this.documentsService.delete(id);
  }

  @Get("health/ai")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async checkAiHealth() {
    return this.documentsService.checkAiHealth();
  }

  @Get(":id/download")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async downloadPdf(
    @Param("id", ParseUUIDPipe) id: string,
    @Response() res: any,
  ) {
    const document = await this.documentsService.findById(id);

    if (!document.finalPdfUrl) {
      throw new NotFoundException("PDF not found");
    }

    // If it's a data URL, extract base64 and send
    if (document.finalPdfUrl.startsWith("data:application/pdf;base64,")) {
      const base64 = document.finalPdfUrl.replace(
        "data:application/pdf;base64,",
        "",
      );
      const buffer = Buffer.from(base64, "base64");

      const filename = sanitizeFilename(document.title);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}.pdf"`,
      );
      res.send(buffer);
    } else {
      throw new NotFoundException("Invalid PDF URL");
    }
  }
}
