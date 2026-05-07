import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

export interface TelemetryLogParams {
  functionName: string;
  userId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Haiku 4.5 pricing (USD per token) — verify at docs.anthropic.com
const PRICING: Record<
  string,
  { input: number; output: number; cacheRead: number; cacheWrite: number }
> = {
  "claude-haiku-4-5-20251001": {
    input: 1.0 / 1_000_000,
    output: 5.0 / 1_000_000,
    cacheRead: 0.1 / 1_000_000,
    cacheWrite: 1.25 / 1_000_000,
  },
};

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async log(params: TelemetryLogParams): Promise<void> {
    try {
      const price = PRICING[params.model];
      const costUsd = price
        ? params.inputTokens * price.input +
          params.outputTokens * price.output +
          params.cacheReadTokens * price.cacheRead +
          params.cacheCreationTokens * price.cacheWrite
        : 0;

      await this.dataSource.query(
        `INSERT INTO ai.usage_log
           (function, user_id, model, input_tokens, output_tokens,
            cache_read_tokens, cache_creation_tokens, latency_ms,
            cost_usd, success, error, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          params.functionName,
          params.userId ?? null,
          params.model,
          params.inputTokens,
          params.outputTokens,
          params.cacheReadTokens,
          params.cacheCreationTokens,
          params.latencyMs,
          costUsd,
          params.success,
          params.error ?? null,
          params.metadata ? JSON.stringify(params.metadata) : null,
        ],
      );
    } catch (err) {
      // Telemetry must never break the calling function
      this.logger.error(`Telemetry log failed: ${(err as Error).message}`);
    }
  }
}
