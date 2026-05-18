import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entities/user.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { GmailService } from "./gmail.service";
import { GmailController } from "./gmail.controller";

@Module({
  imports: [TypeOrmModule.forFeature([User]), NotificationsModule],
  providers: [GmailService],
  controllers: [GmailController],
})
export class GmailModule {}
