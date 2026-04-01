import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UsersModule } from "../users/users.module";
import { CarddavService } from "./carddav.service";
import { CarddavController } from "./carddav.controller";

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [CarddavController],
  providers: [CarddavService],
  exports: [CarddavService],
})
export class CarddavModule {}
