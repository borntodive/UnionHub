import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MetarController } from "./metar.controller";
import { MetarService } from "./metar.service";
import { RunwaysService } from "./runways.service";
import { OpenAipService } from "../common/services/openaip.service";
import { Runway } from "./entities/runway.entity";
import { Volmet } from "../volmet/entities/volmet.entity";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Runway, Volmet])],
  controllers: [MetarController],
  providers: [MetarService, RunwaysService, OpenAipService],
  exports: [MetarService, RunwaysService],
})
export class MetarModule {}
