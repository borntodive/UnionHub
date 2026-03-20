import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IssueCategory } from "./entities/issue-category.entity";
import { IssueCategoriesService } from "./issue-categories.service";
import { IssueCategoriesController } from "./issue-categories.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [TypeOrmModule.forFeature([IssueCategory]), NotificationsModule],
  controllers: [IssueCategoriesController],
  providers: [IssueCategoriesService],
  exports: [IssueCategoriesService],
})
export class IssueCategoriesModule {}
