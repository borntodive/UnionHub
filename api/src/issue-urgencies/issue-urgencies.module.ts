import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IssueUrgency } from "./entities/issue-urgency.entity";
import { IssueUrgenciesService } from "./issue-urgencies.service";
import { IssueUrgenciesController } from "./issue-urgencies.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [TypeOrmModule.forFeature([IssueUrgency]), NotificationsModule],
  controllers: [IssueUrgenciesController],
  providers: [IssueUrgenciesService],
  exports: [IssueUrgenciesService],
})
export class IssueUrgenciesModule {}
