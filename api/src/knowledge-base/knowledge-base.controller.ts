import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { UploadDocumentDto } from "./dto/upload-document.dto";

@Controller("knowledge-base")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  findAll() {
    return this.kbService.findAll();
  }

  @Post("upload")
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ) {
    return this.kbService.uploadDocument(
      file.buffer,
      file.originalname,
      dto.title,
      dto.accessLevel,
      req.user.userId,
      dto.ruolo,
    );
  }

  @Post(":id/reindex")
  @HttpCode(HttpStatus.ACCEPTED)
  async reindex(@Param("id", ParseUUIDPipe) id: string, @Req() req: any) {
    await this.kbService.reindexDocument(id, req.user.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.kbService.deleteDocument(id);
  }
}
