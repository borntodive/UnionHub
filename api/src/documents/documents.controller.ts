import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  Response,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import {
  CreateDocumentDto,
  ReviewDocumentDto,
  ApproveDocumentDto,
  UpdateTranslationDto,
  RejectDocumentDto,
} from "./dto/create-document.dto";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: UserRole;
  };
}

/**
 * Documents Controller
 * Manage union communications with AI assistance
 * ADMIN and SUPERADMIN access
 */
@Controller("documents")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll() {
    return this.documentsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.documentsService.findById(id);
  }

  @Post()
  async create(
    @Body() dto: CreateDocumentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.create(dto, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(":id/review")
  async review(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.documentsService.review(id, dto);
  }

  @Post(":id/approve")
  async approve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveDocumentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.approve(id, dto, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(":id/verify")
  async verify(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.verify(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(":id/publish")
  async publish(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.publish(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Patch(":id/translation")
  async updateTranslation(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTranslationDto,
  ) {
    return this.documentsService.updateTranslation(id, dto);
  }

  @Patch(":id/reject")
  async reject(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.documentsService.reject(id, dto.rejectionReason);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    await this.documentsService.delete(id);
  }

  @Post(":id/regenerate")
  async regeneratePdf(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.regeneratePdf(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(":id/regenerate-translations")
  async regenerateTranslations(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.documentsService.regenerateTranslations(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Get("health/ollama")
  async checkOllamaHealth() {
    return this.documentsService.checkOllamaHealth();
  }

  @Get(":id/download")
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

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${document.title}.pdf"`,
      );
      res.send(buffer);
    } else {
      // It's a URL, redirect to it
      res.redirect(document.finalPdfUrl);
    }
  }
}
