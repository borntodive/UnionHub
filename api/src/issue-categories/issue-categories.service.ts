import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IssueCategory } from "./entities/issue-category.entity";
import { CreateIssueCategoryDto } from "./dto/create-issue-category.dto";
import { UpdateIssueCategoryDto } from "./dto/update-issue-category.dto";
import { Ruolo } from "../common/enums/ruolo.enum";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class IssueCategoriesService {
  constructor(
    @InjectRepository(IssueCategory)
    private readonly repo: Repository<IssueCategory>,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(ruolo?: Ruolo): Promise<IssueCategory[]> {
    if (ruolo) {
      return this.repo.find({ where: { ruolo }, order: { nameEn: "ASC" } });
    }
    return this.repo.find({ order: { ruolo: "ASC", nameEn: "ASC" } });
  }

  async findById(id: string): Promise<IssueCategory> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException("Issue category not found");
    return cat;
  }

  async create(dto: CreateIssueCategoryDto): Promise<IssueCategory> {
    const cat = await this.repo.save(this.repo.create(dto));
    this.notificationsService
      .broadcastSilent("CATEGORIES_UPDATED")
      .catch(() => {});
    return cat;
  }

  async update(
    id: string,
    dto: UpdateIssueCategoryDto,
  ): Promise<IssueCategory> {
    const cat = await this.findById(id);
    Object.assign(cat, dto);
    const saved = await this.repo.save(cat);
    this.notificationsService
      .broadcastSilent("CATEGORIES_UPDATED")
      .catch(() => {});
    return saved;
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findById(id);
    await this.repo.remove(cat);
    this.notificationsService
      .broadcastSilent("CATEGORIES_UPDATED")
      .catch(() => {});
  }
}
