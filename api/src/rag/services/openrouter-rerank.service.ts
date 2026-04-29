import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";

export interface RerankItem {
  index: number;
  score: number;
  text: string;
}

@Injectable()
export class OpenRouterRerankService {
  private readonly logger = new Logger(OpenRouterRerankService.name);
  private readonly llm: ChatOpenAI;
  private readonly modelName: string;

  constructor(private configService: ConfigService) {
    this.modelName =
      this.configService.get<string>("OPENROUTER_RERANK_MODEL") ||
      "qwen/qwen-2.5-7b-instruct";

    this.llm = new ChatOpenAI({
      model: this.modelName,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: this.configService.get<string>("OPENROUTER_API_KEY"),
      },
      temperature: 0,
    });
  }

  async rerank(
    query: string,
    passages: string[],
    topK: number,
  ): Promise<RerankItem[]> {
    if (passages.length === 0) {
      return [];
    }

    const effectiveTopK = Math.min(topK, passages.length);

    try {
      const prompt = `Rank these passages by relevance to: "${query}"

Passages:
${passages.map((p, i) => `[${i}] ${p.slice(300)}...`).join("\n")}

Return only the top ${effectiveTopK} indices in order (comma-separated, no extra text).`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Parse indices from response
      const indices = content
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 0 && n < passages.length);

      // If parsing failed, return original order
      if (indices.length === 0) {
        this.logger.warn("Reranking parsing failed, returning original order");
        return passages.slice(0, effectiveTopK).map((text, idx) => ({
          index: idx,
          score: 1 - idx / passages.length,
          text,
        }));
      }

      return indices.slice(0, effectiveTopK).map((idx, rank) => ({
        index: idx,
        score: 1 - rank / indices.length,
        text: passages[idx],
      }));
    } catch (error) {
      this.logger.error(`Reranking failed: ${error.message}`);
      // Fallback: return original order
      return passages.slice(0, effectiveTopK).map((text, idx) => ({
        index: idx,
        score: 1 - idx / passages.length,
        text,
      }));
    }
  }
}
