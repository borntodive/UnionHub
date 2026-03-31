import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { IngestionService } from "../services/ingestion.service";
import { IngestionStartDto } from "../dto/ingestion-start.dto";

@Controller("rag/ingestion")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class RagIngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post("start")
  async start(@Body() dto: IngestionStartDto) {
    return this.ingestionService.startJob(dto);
  }

  @Get(":jobId")
  async status(@Param("jobId", ParseUUIDPipe) jobId: string) {
    return this.ingestionService.getJobStatus(jobId);
  }

  @Post(":jobId/retry")
  async retry(@Param("jobId", ParseUUIDPipe) jobId: string) {
    return this.ingestionService.retryJob(jobId);
  }
}
