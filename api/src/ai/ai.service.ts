import { Injectable, Logger } from "@nestjs/common";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { TRANSLATE_SYSTEM } from "./prompts/translate.prompt";
import { REWRITE_SYSTEM } from "./prompts/rewrite.prompt";
import { ISSUE_SUMMARY_SYSTEM } from "./prompts/summarize.prompt";
import { TITLE_TRANSLATE_SYSTEM } from "./prompts/generate.prompt";

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

  getConfig(): { model: string } {
    return { model: "claude-haiku-4-5-20251001" };
  }
}
