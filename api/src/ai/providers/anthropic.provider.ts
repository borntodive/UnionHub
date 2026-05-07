import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { TelemetryService } from "../telemetry/telemetry.service";

export interface CompleteParams {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  /** Identifies the calling function for telemetry (e.g. "translate", "rewrite") */
  functionName: string;
  userId?: string;
}

export interface CompleteResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

const MODEL = "claude-haiku-4-5-20251001";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class AnthropicProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic;

  constructor(
    private readonly config: ConfigService,
    private readonly telemetry: TelemetryService,
  ) {
    this.client = new Anthropic({
      apiKey: config.get<string>("ANTHROPIC_API_KEY") ?? "",
    });
  }

  async complete(params: CompleteParams): Promise<CompleteResult> {
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: MODEL,
          max_tokens: params.maxTokens ?? 2048,
          temperature: params.temperature ?? 0.0,
          ...(params.system ? { system: params.system } : {}),
          messages: params.messages,
        });

        const text =
          response.content
            .filter((b) => b.type === "text")
            .map((b) => (b as { type: "text"; text: string }).text)
            .join("") ?? "";

        const result: CompleteResult = {
          text,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens:
            (
              response.usage as unknown as {
                cache_read_input_tokens?: number;
              }
            ).cache_read_input_tokens ?? 0,
          cacheCreationTokens:
            (
              response.usage as unknown as {
                cache_creation_input_tokens?: number;
              }
            ).cache_creation_input_tokens ?? 0,
        };

        await this.telemetry.log({
          functionName: params.functionName,
          userId: params.userId,
          model: MODEL,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cacheReadTokens: result.cacheReadTokens,
          cacheCreationTokens: result.cacheCreationTokens,
          latencyMs: Date.now() - start,
          success: true,
        });

        return result;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const status = (err as { status?: number }).status ?? 0;

        // Don't retry on auth or bad-request errors
        if (status === 401 || status === 400) break;

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          this.logger.warn(
            `Anthropic attempt ${attempt} failed (${status}), retrying in ${delay}ms`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    await this.telemetry.log({
      functionName: params.functionName,
      userId: params.userId,
      model: MODEL,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      latencyMs: Date.now() - start,
      success: false,
      error: lastError?.message,
    });

    throw lastError;
  }
}
