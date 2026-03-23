import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entities/user.entity";
import { GmailService } from "./gmail.service";
import { GmailController, GmailWebhookController } from "./gmail.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [TypeOrmModule.forFeature([User]), NotificationsModule],
  providers: [GmailService],
  controllers: [GmailController, GmailWebhookController],
})
export class GmailModule {}
