import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { BackupsService } from "./backups.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

@Controller("backups")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  async listBackups() {
    return this.backupsService.listBackups();
  }

  @Post()
  @Throttle({ default: { limit: 1, ttl: 300000 } })
  async createBackup() {
    return this.backupsService.createBackup();
  }

  @Delete(":folderId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBackup(@Param("folderId") folderId: string) {
    await this.backupsService.deleteBackup(folderId);
  }

  @Post(":folderId/restore")
  async restoreBackup(@Param("folderId") folderId: string) {
    return this.backupsService.restoreBackup(folderId);
  }
}
