import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { HybridRagService } from "./hybrid-rag.service";

class AskDto {
  @IsString()
  @MinLength(1)
  question: string;
}

@Controller("ai/kb")
@UseGuards(JwtAuthGuard)
export class HybridRagController {
  constructor(private readonly rag: HybridRagService) {}

  @Post("ask")
  @HttpCode(200)
  ask(@Body() dto: AskDto) {
    return this.rag.ask(dto.question);
  }

  @Get("documents")
  documents() {
    return this.rag.listDocuments();
  }

  @Get("status")
  status() {
    return this.rag.healthCheck();
  }
}
