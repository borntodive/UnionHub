import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { TRANSLATE_SYSTEM } from "./prompts/translate.prompt";
import { REWRITE_SYSTEM } from "./prompts/rewrite.prompt";
import { ISSUE_SUMMARY_SYSTEM } from "./prompts/summarize.prompt";
import { TITLE_TRANSLATE_SYSTEM } from "./prompts/generate.prompt";

export interface ParsedFlight {
  flightNumber: string | null;
  depAirport: string | null;
  depTime: string | null; // HH:MM local
  arrAirport: string | null;
  arrTime: string | null; // HH:MM local
}

export interface ParsedDuty {
  reportTime: string | null;
  sectors: number | null;
  standbyType: "none" | "home" | "airport";
  standbyStartTime: string | null;
  finishTime: string | null;
  homeBase: boolean;
  flights: ParsedFlight[];
}

function detectMediaType(
  base64: string,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  // Decode first 12 bytes to inspect magic numbers
  const head = Buffer.from(base64.slice(0, 24), "base64");
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  )
    return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8) return "image/jpeg";
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46)
    return "image/gif";
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  )
    return "image/webp";
  return "image/jpeg"; // fallback
}

const PARSE_DUTY_SYSTEM = `You are an aviation crew roster parser. Extract duty information and return ONLY valid JSON — no markdown, no explanation, no code fences.

Schema (use null for unknown fields):
{"reportTime":"HH:MM","sectors":N,"standbyType":"none|home|airport","standbyStartTime":"HH:MM|null","finishTime":"HH:MM|null","homeBase":true|false,"flights":[{"flightNumber":"FR1234","depAirport":"CIA","depTime":"HH:MM","arrAirport":"STN","arrTime":"HH:MM"}]}

Rules:
- All times in 24h LOCAL TIME (LT) — NEVER Zulu/UTC
- Each row typically shows both Z (UTC) and LT. ALWAYS use the LT value.
- reportTime = CHECKIN local time (LT)
- finishTime = CHECKOUT local time (LT)
- sectors = count of flight legs (rows showing a flight number like FR1234)
- standbyType: HSBY/Home Standby = "home", ASBY/Airport Standby = "airport", otherwise "none"
- standbyStartTime = local time (LT) when standby period began (only if standbyType != "none")
- homeBase = true if first and last airport code are the same
- flights = ordered list of each flight leg with dep/arr airport codes and dep/arr LOCAL times (LT). Order must match the duty sequence.`;

const HTML_RE = /<[a-z][\s\S]*?>/i;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly anthropic: AnthropicProvider) {}

  async rewriteAsUnionCommunication(
    content: string,
    userId?: string,
  ): Promise<string> {
    const preserveHtml = HTML_RE.test(content);
    const result = await this.anthropic.complete({
      functionName: "rewrite",
      userId,
      system: REWRITE_SYSTEM(preserveHtml),
      messages: [{ role: "user", content }],
      maxTokens: Math.max(1024, Math.ceil(content.length * 1.5)),
    });
    return result.text;
  }

  async translateToEnglish(content: string, userId?: string): Promise<string> {
    const preserveHtml = HTML_RE.test(content);
    const result = await this.anthropic.complete({
      functionName: "translate",
      userId,
      system: TRANSLATE_SYSTEM(preserveHtml),
      messages: [{ role: "user", content }],
      maxTokens: Math.max(1024, Math.ceil(content.length * 1.5)),
    });
    return result.text;
  }

  async generate(
    prompt: string,
    systemPrompt: string,
    userId?: string,
  ): Promise<string> {
    const result = await this.anthropic.complete({
      functionName: "generate",
      userId,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 1024,
    });
    return result.text;
  }

  async summarizeIssues(issueText: string, userId?: string): Promise<string> {
    const result = await this.anthropic.complete({
      functionName: "summarize_issues",
      userId,
      system: ISSUE_SUMMARY_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Segnalazioni aperte:\n${issueText}\n\nRiassunto:`,
        },
      ],
      maxTokens: 1024,
    });
    return result.text;
  }

  async translateTitle(title: string, userId?: string): Promise<string> {
    const result = await this.anthropic.complete({
      functionName: "translate_title",
      userId,
      system: TITLE_TRANSLATE_SYSTEM,
      messages: [{ role: "user", content: title }],
      maxTokens: 128,
    });
    return result.text.trim();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.anthropic.complete({
        functionName: "health_check",
        system: "Reply with OK.",
        messages: [{ role: "user", content: "ping" }],
        maxTokens: 5,
      });
      return result.text.length > 0;
    } catch (err) {
      this.logger.error(`AI health check failed: ${(err as Error).message}`);
      return false;
    }
  }

  async parseDuty(input: {
    image?: string;
    text?: string;
  }): Promise<ParsedDuty> {
    if (!input.image && !input.text) {
      throw new BadRequestException("Provide image (base64) or text");
    }

    let raw: string;

    if (input.image) {
      const result = await this.anthropic.completeWithVision({
        functionName: "parse_duty",
        system: PARSE_DUTY_SYSTEM,
        imageBase64: input.image,
        mediaType: detectMediaType(input.image),
        prompt: "Extract the duty information from this roster screenshot.",
        maxTokens: 1024,
      });
      raw = result.text;
    } else {
      const result = await this.anthropic.complete({
        functionName: "parse_duty",
        system: PARSE_DUTY_SYSTEM,
        messages: [{ role: "user", content: input.text! }],
        maxTokens: 1024,
      });
      raw = result.text;
    }

    try {
      const clean = raw
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();
      const parsed = JSON.parse(clean) as ParsedDuty;
      return {
        reportTime: parsed.reportTime ?? null,
        sectors: parsed.sectors ?? null,
        standbyType: parsed.standbyType ?? "none",
        standbyStartTime: parsed.standbyStartTime ?? null,
        finishTime: parsed.finishTime ?? null,
        homeBase: parsed.homeBase ?? true,
        flights: Array.isArray(parsed.flights) ? parsed.flights : [],
      };
    } catch {
      this.logger.error(`parseDuty: failed to parse AI response: ${raw}`);
      throw new BadRequestException("AI could not extract duty data");
    }
  }

  getConfig(): { model: string } {
    return { model: "claude-haiku-4-5-20251001" };
  }
}
