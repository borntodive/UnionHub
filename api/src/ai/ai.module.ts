import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { TelemetryService } from "./telemetry/telemetry.service";

@Module({
  controllers: [AiController],
  providers: [TelemetryService, AnthropicProvider, AiService],
  exports: [AiService],
})
export class AiModule {}
