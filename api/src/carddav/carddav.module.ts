import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UsersModule } from "../users/users.module";
import { CarddavService } from "./carddav.service";

@Module({
  imports: [ConfigModule, UsersModule],
  providers: [CarddavService],
  exports: [CarddavService],
})
export class CarddavModule {}
