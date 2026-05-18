import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Response } from "express";
import { AppReleasesService } from "./app-releases.service";
import { CreateReleaseDto } from "./dto/create-release.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

const uploadsDir =
  process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");

const apkStorage = diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    const dir = path.join(uploadsDir, "apk");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

@Controller("app-releases")
export class AppReleasesController {
  constructor(private readonly appReleasesService: AppReleasesService) {}

  // Public — no guard
  @Get("latest")
  async getLatest(@Query("platform") platform: string = "all") {
    return this.appReleasesService.getLatest(platform);
  }

  // Public — no guard — download latest APK without knowing release ID
  @Get("latest/download")
  async downloadLatestApk(
    @Query("platform") platform: string = "android",
    @Res() res: Response,
  ) {
    const { filePath, filename } =
      await this.appReleasesService.getLatestApkPath(platform);
    res.download(filePath, filename);
  }

  // Public — no guard — Android devices download APK directly
  @Get(":id/download")
  async downloadApk(@Param("id") id: string, @Res() res: Response) {
    const { filePath, filename } = await this.appReleasesService.getApkPath(id);
    res.download(filePath, filename);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @UseInterceptors(
    FileInterceptor("apk", {
      storage: apkStorage,
      limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    }),
  )
  async create(
    @Body() dto: CreateReleaseDto,
    @UploadedFile() apkFile?: Express.Multer.File,
  ) {
    return this.appReleasesService.create(dto, apkFile);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async findAll() {
    return this.appReleasesService.findAll();
  }
}
