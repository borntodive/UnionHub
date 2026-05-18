import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppReleasesService } from "./app-releases.service";
import { AppReleasesController } from "./app-releases.controller";
import { AppRelease } from "./entities/app-release.entity";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [TypeOrmModule.forFeature([AppRelease]), NotificationsModule],
  controllers: [AppReleasesController],
  providers: [AppReleasesService],
})
export class AppReleasesModule {}
