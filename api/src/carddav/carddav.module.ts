import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { CarddavService } from "./carddav.service";

@Module({
  imports: [UsersModule],
  providers: [CarddavService],
  exports: [CarddavService],
})
export class CarddavModule {}
