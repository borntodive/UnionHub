import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SuperAdminGuard } from "../common/guards/super-admin.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { ChatDto } from "./dto/chat.dto";
import { RagService } from "./rag.service";
import type {
  ChatResponse,
  RagStatus,
  DocumentCategory,
  ReindexProgress,
} from "./rag.types";

// Re-export types for controller return types
export type { ChatResponse, RagStatus, DocumentCategory, ReindexProgress };

@Controller("rag")
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * Reindex all documents (SuperAdmin only) - runs in background
   */
  @Post("reindex")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async reindex() {
    return this.ragService.reindex();
  }

  /**
   * Chat with RAG (Admin+ only)
   */
  @Post("chat")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async chat(@Body() chatDto: ChatDto) {
    return this.ragService.chat(chatDto.question, chatDto.history);
  }

  /**
   * Get RAG status (SuperAdmin only)
   */
  @Get("status")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async getStatus() {
    return this.ragService.getStatus();
  }

  /**
   * List all documents in knowledge base (SuperAdmin only)
   */
  @Get("documents")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async listDocuments() {
    return this.ragService.listDocuments();
  }

  /**
   * Get reindex progress (SuperAdmin only)
   */
  @Get("progress")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  getProgress(): ReindexProgress {
    return this.ragService.getProgress();
  }
}
