import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { SuperAdminGuard } from "../../common/guards/super-admin.guard";
import { KbService } from "./kb.service";

class ChatMessageDto {
  @IsIn(["user", "assistant"])
  role: "user" | "assistant";

  @IsString()
  content: string;
}

class AskDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}

@Controller("ai/kb")
export class KbController {
  constructor(private readonly kb: KbService) {}

  /**
   * Ask the KB assistant (Admin+)
   * To open to all members: remove @Roles and RolesGuard, keep only JwtAuthGuard
   */
  @Post("ask")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async ask(@Body() dto: AskDto, @Request() req: { user: { userId: string } }) {
    return this.kb.ask(dto.question, dto.history ?? [], req.user.userId);
  }

  /** Trigger re-ingest (fire-and-forget). Returns immediately. SuperAdmin only. */
  @Post("ingest")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  ingest() {
    return this.kb.ingest();
  }

  /** Poll ingest progress. SuperAdmin only. */
  @Get("ingest/progress")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  ingestProgress() {
    return this.kb.getIngestProgress();
  }

  /** KB status — page count + Python service health. SuperAdmin only. */
  @Get("status")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async status() {
    return this.kb.getStatus();
  }
}
