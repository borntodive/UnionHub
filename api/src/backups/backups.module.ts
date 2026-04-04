import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BackupsController } from "./backups.controller";
import { BackupsService } from "./backups.service";

@Module({
  imports: [ConfigModule],
  controllers: [BackupsController],
  providers: [BackupsService],
})
export class BackupsModule {}
