import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
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
