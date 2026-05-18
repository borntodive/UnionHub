import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import { AppRelease } from "./entities/app-release.entity";
import { CreateReleaseDto } from "./dto/create-release.dto";
import { NotificationsService } from "../notifications/notifications.service";

const uploadsDir =
  process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");

@Injectable()
export class AppReleasesService {
  constructor(
    @InjectRepository(AppRelease)
    private readonly appReleaseRepository: Repository<AppRelease>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    dto: CreateReleaseDto,
    apkFile?: Express.Multer.File,
  ): Promise<AppRelease> {
    const platform = dto.platform ?? "all";

    if ((platform === "android" || platform === "all") && !apkFile) {
      throw new BadRequestException(
        "APK file is required for android/all platforms",
      );
    }

    const release = this.appReleaseRepository.create({
      version: dto.version,
      minVersion: dto.minVersion ?? null,
      platform,
      releaseNotes: dto.releaseNotes ?? null,
      apkFilename: apkFile?.filename ?? null,
    });

    const saved = await this.appReleaseRepository.save(release);

    await this.notificationsService.broadcastVersionNotification({
      version: dto.version,
      minVersion: dto.minVersion,
      platform: dto.platform,
      releaseNotes: dto.releaseNotes,
    });

    return saved;
  }

  async getLatest(platform: string): Promise<AppRelease | null> {
    return this.appReleaseRepository.findOne({
      where: { platform: In([platform, "all"]) },
      order: { createdAt: "DESC" },
    });
  }

  async findAll(): Promise<AppRelease[]> {
    return this.appReleaseRepository.find({ order: { createdAt: "DESC" } });
  }

  async getApkPath(
    id: string,
  ): Promise<{ filePath: string; filename: string }> {
    const release = await this.appReleaseRepository.findOne({ where: { id } });
    if (!release) throw new NotFoundException("Release not found");
    if (!release.apkFilename)
      throw new NotFoundException("No APK for this release");

    const filePath = path.join(uploadsDir, "apk", release.apkFilename);
    if (!fs.existsSync(filePath))
      throw new NotFoundException("APK file not found on disk");

    return {
      filePath,
      filename: `UnionHub_${release.version.replace(/\./g, "_")}.apk`,
    };
  }
}
