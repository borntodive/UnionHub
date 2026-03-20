import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IssueUrgency } from "./entities/issue-urgency.entity";
import { CreateIssueUrgencyDto } from "./dto/create-issue-urgency.dto";
import { UpdateIssueUrgencyDto } from "./dto/update-issue-urgency.dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class IssueUrgenciesService {
  constructor(
    @InjectRepository(IssueUrgency)
    private readonly repo: Repository<IssueUrgency>,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(): Promise<IssueUrgency[]> {
    return this.repo.find({ order: { level: "ASC" } });
  }

  async findById(id: string): Promise<IssueUrgency> {
    const urg = await this.repo.findOne({ where: { id } });
    if (!urg) throw new NotFoundException("Issue urgency not found");
    return urg;
  }

  async create(dto: CreateIssueUrgencyDto): Promise<IssueUrgency> {
    const urg = await this.repo.save(this.repo.create(dto));
    this.notificationsService
      .broadcastSilent("URGENCIES_UPDATED")
      .catch(() => {});
    return urg;
  }

  async update(id: string, dto: UpdateIssueUrgencyDto): Promise<IssueUrgency> {
    const urg = await this.findById(id);
    Object.assign(urg, dto);
    const saved = await this.repo.save(urg);
    this.notificationsService
      .broadcastSilent("URGENCIES_UPDATED")
      .catch(() => {});
    return saved;
  }

  async remove(id: string): Promise<void> {
    const urg = await this.findById(id);
    await this.repo.remove(urg);
    this.notificationsService
      .broadcastSilent("URGENCIES_UPDATED")
      .catch(() => {});
  }
}
