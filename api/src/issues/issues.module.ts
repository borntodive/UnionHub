import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Issue } from "./entities/issue.entity";
import { IssueAttachment } from "./entities/issue-attachment.entity";
import { IssueCategory } from "../issue-categories/entities/issue-category.entity";
import { IssueUrgency } from "../issue-urgencies/entities/issue-urgency.entity";
import { IssuesService } from "./issues.service";
import { IssuesController } from "./issues.controller";
import { AiModule } from "../ai/ai.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Issue,
      IssueAttachment,
      IssueCategory,
      IssueUrgency,
    ]),
    AiModule,
    NotificationsModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
