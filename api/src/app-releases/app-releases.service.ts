import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { AppRelease } from "./entities/app-release.entity";
import { CreateReleaseDto } from "./dto/create-release.dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class AppReleasesService {
  constructor(
    @InjectRepository(AppRelease)
    private readonly appReleaseRepository: Repository<AppRelease>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateReleaseDto): Promise<AppRelease> {
    const release = this.appReleaseRepository.create({
      version: dto.version,
      minVersion: dto.minVersion ?? null,
      platform: dto.platform ?? "all",
      releaseNotes: dto.releaseNotes ?? null,
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
}
