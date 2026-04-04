import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Response } from "express";
import { IssuesService } from "./issues.service";
import { CreateIssueDto } from "./dto/create-issue.dto";
import { UpdateIssueDto } from "./dto/update-issue.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const uploadsDir =
  process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");

const multerOptions = {
  storage: diskStorage({
    destination: (req: any, _file: any, cb: any) => {
      const issueDir = path.join(uploadsDir, "issues", req.params.id);
      fs.mkdirSync(issueDir, { recursive: true });
      cb(null, issueDir);
    },
    filename: (_req: any, file: any, cb: any) => {
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${uuidv4()}_${sanitized}`);
    },
  }),
  fileFilter: (_req: any, file: any, cb: any) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException("File type not allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
};

@Controller("issues")
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly service: IssuesService) {}

  @Post()
  create(@Body() dto: CreateIssueDto, @Req() req: any) {
    return this.service.create(dto, req.user.userId, req.user.ruolo);
  }

  @Get("my")
  getMyIssues(@Req() req: any) {
    return this.service.findMyIssues(req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @Post("summary")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getSummary(@Req() req: any) {
    return this.service.generateSummary(req.user);
  }

  @Get("export")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async exportCsv(@Req() req: any, @Res() res: Response) {
    const csv = await this.service.exportCsv(req.user);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="issues.csv"');
    res.setHeader("Cache-Control", "no-store");
    res.send(csv);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.findById(id, req.user);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIssueDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Patch(":id/reopen")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  reopen(@Param("id", ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.reopen(id, req.user);
  }

  @Post(":id/attachments")
  @UseInterceptors(FilesInterceptor("files", 5, multerOptions))
  async uploadAttachments(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }
    return this.service.addAttachments(
      id,
      req.user.userId,
      req.user.role,
      files,
    );
  }

  @Delete(":id/attachments/:attachmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("attachmentId", ParseUUIDPipe) attachmentId: string,
    @Req() req: any,
  ) {
    await this.service.deleteAttachment(
      id,
      attachmentId,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.service.remove(id);
  }
}
