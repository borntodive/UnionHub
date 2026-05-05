import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VolmetController } from "./volmet.controller";
import { VolmetService } from "./volmet.service";
import { Volmet } from "./entities/volmet.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Volmet])],
  controllers: [VolmetController],
  providers: [VolmetService],
  exports: [VolmetService],
})
export class VolmetModule {}
