import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { AppReleasesService } from "./app-releases.service";
import { CreateReleaseDto } from "./dto/create-release.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

@Controller("app-releases")
export class AppReleasesController {
  constructor(private readonly appReleasesService: AppReleasesService) {}

  // Public — no guard — mobile checks this on startup to detect outdated builds
  @Get("latest")
  async getLatest(@Query("platform") platform: string = "all") {
    return this.appReleasesService.getLatest(platform);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() dto: CreateReleaseDto) {
    return this.appReleasesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async findAll() {
    return this.appReleasesService.findAll();
  }
}
