import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { TelemetryService } from "./telemetry/telemetry.service";

@Module({
  providers: [TelemetryService, AnthropicProvider, AiService],
  exports: [AiService],
})
export class AiModule {}
