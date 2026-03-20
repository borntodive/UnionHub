import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Issue } from "./entities/issue.entity";
import { IssueCategory } from "../issue-categories/entities/issue-category.entity";
import { IssueUrgency } from "../issue-urgencies/entities/issue-urgency.entity";
import { IssuesService } from "./issues.service";
import { IssuesController } from "./issues.controller";
import { OllamaModule } from "../ollama/ollama.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Issue, IssueCategory, IssueUrgency]),
    OllamaModule,
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
