import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import databaseConfig from "./config/database.config";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { BasesModule } from "./bases/bases.module";
import { ContractsModule } from "./contracts/contracts.module";
import { ClaContractsModule } from "./cla-contracts/cla-contracts.module";
import { GradesModule } from "./grades/grades.module";
import { DocumentsModule } from "./documents/documents.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { IssueCategoriesModule } from "./issue-categories/issue-categories.module";
import { IssueUrgenciesModule } from "./issue-urgencies/issue-urgencies.module";
import { IssuesModule } from "./issues/issues.module";
import { KnowledgeBaseModule } from "./knowledge-base/knowledge-base.module";
import { ChatbotModule } from "./chatbot/chatbot.module";
import { GmailModule } from "./gmail/gmail.module";

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000,
        limit: 60,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get("database"),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    BasesModule,
    ContractsModule,
    ClaContractsModule,
    GradesModule,
    DocumentsModule,
    NotificationsModule,
    IssueCategoriesModule,
    IssueUrgenciesModule,
    IssuesModule,
    KnowledgeBaseModule,
    ChatbotModule,
    GmailModule,
  ],
})
export class AppModule {}
