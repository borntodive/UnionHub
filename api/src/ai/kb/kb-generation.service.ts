import { Injectable } from "@nestjs/common";
import { AnthropicProvider } from "../providers/anthropic.provider";
import { KB_GENERATION_SYSTEM, buildKbUserMessage } from "../prompts/kb.prompt";
import type { RetrievedPage } from "./kb-retrieval.service";

export interface GenerationResult {
  answer: string;
  sources: string[];
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class KbGenerationService {
  constructor(private readonly anthropic: AnthropicProvider) {}

  async generate(
    question: string,
    context: RetrievedPage[],
    history: Array<{ role: "user" | "assistant"; content: string }> = [],
    userId?: string,
  ): Promise<GenerationResult> {
    const sources = [...new Set(context.map((c) => c.title))];

    const userMessage = buildKbUserMessage(
      context.map((c) => ({ title: c.title, content: c.content })),
      question,
    );

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history.slice(-6),
      { role: "user", content: userMessage },
    ];

    const result = await this.anthropic.complete({
      functionName: "kb_ask",
      userId,
      system: KB_GENERATION_SYSTEM,
      messages,
      maxTokens: 1024,
      temperature: 0.1,
    });

    return {
      answer: result.text,
      sources,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  }
}
