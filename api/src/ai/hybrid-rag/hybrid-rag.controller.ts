import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { extname } from "path";
import { IsString, MinLength, IsBoolean, IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { marked } from "marked";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { SuperAdminGuard } from "../../common/guards/super-admin.guard";
import { HybridRagService } from "./hybrid-rag.service";

function mdToHtml(text: string): string {
  const stripped = text.replace(/\s*\[doc:[^\]]+\]/g, "").trim();
  return marked.parse(stripped) as string;
}

class AskDto {
  @IsString()
  @MinLength(1)
  question: string;
}

class IngestDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true")
  force?: boolean;
}

@Controller("ai/kb")
@UseGuards(JwtAuthGuard)
export class HybridRagController {
  constructor(private readonly rag: HybridRagService) {}

  @Post("upload")
  @HttpCode(200)
  @UseGuards(SuperAdminGuard)
  @UseInterceptors(
    FilesInterceptor("files", 50, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (ext !== ".md" && ext !== ".pdf") {
          return cb(
            new BadRequestException("Only .md and .pdf files are allowed"),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException("No files provided");
    const saved = await this.rag.saveKbFiles(files);
    return { uploaded: saved };
  }

  @Post("ask")
  @HttpCode(200)
  async ask(@Body() dto: AskDto) {
    const result = await this.rag.ask(dto.question);
    return { ...result, answer: mdToHtml(result.answer) };
  }

  @Get("documents")
  documents() {
    return this.rag.listDocuments();
  }

  @Get("status")
  status() {
    return this.rag.healthCheck();
  }

  @Post("ingest")
  @HttpCode(200)
  @UseGuards(SuperAdminGuard)
  ingest(@Body() dto: IngestDto) {
    return this.rag.ingest(dto.force ?? false);
  }
}
