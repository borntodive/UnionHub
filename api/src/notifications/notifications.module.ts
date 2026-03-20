import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { DeviceToken } from "./entities/device-token.entity";

@Module({
  imports: [TypeOrmModule.forFeature([DeviceToken])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
