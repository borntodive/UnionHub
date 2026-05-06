import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VolmetController } from "./volmet.controller";
import { VolmetService } from "./volmet.service";
import { OpenAipService } from "../common/services/openaip.service";
import { Volmet } from "./entities/volmet.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Volmet])],
  controllers: [VolmetController],
  providers: [VolmetService, OpenAipService],
  exports: [VolmetService],
})
export class VolmetModule {}
