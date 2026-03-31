import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { RagDocumentService } from "../services/rag-document.service";
import { UploadDocumentDto } from "../dto/upload-document.dto";

const pdfUploadInterceptor = FileInterceptor("file", {
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"), false);
    }
  },
});

@Controller("rag/documents")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class RagDocumentController {
  constructor(private readonly ragDocumentService: RagDocumentService) {}

  @Post("upload")
  @UseInterceptors(pdfUploadInterceptor)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.ragDocumentService.upload(file, dto);
  }

  @Get()
  async findAll() {
    return this.ragDocumentService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.ragDocumentService.findById(id);
  }

  @Get(":id/chunks")
  async findChunks(@Param("id", ParseUUIDPipe) id: string) {
    return this.ragDocumentService.findChunks(id);
  }

  @Delete(":id")
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    await this.ragDocumentService.delete(id);
    return { success: true, message: "Document deleted successfully" };
  }
}
