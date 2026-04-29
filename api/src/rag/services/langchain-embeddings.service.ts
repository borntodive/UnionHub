import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OpenAIEmbeddings } from "@langchain/openai";

interface OpenRouterEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class LangChainEmbeddingsService {
  private readonly logger = new Logger(LangChainEmbeddingsService.name);
  private readonly embeddings: OpenAIEmbeddings;
  private readonly modelName: string;
  private readonly apiKey: string;
  private readonly baseURL = "https://openrouter.ai/api/v1";

  constructor(private configService: ConfigService) {
    this.modelName =
      this.configService.get<string>("OPENROUTER_EMBED_MODEL") ||
      "openai/text-embedding-3-small";

    const apiKey = this.configService.get<string>("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    this.apiKey = apiKey;

    this.embeddings = new OpenAIEmbeddings({
      model: this.modelName,
      configuration: {
        baseURL: this.baseURL,
        apiKey: this.apiKey,
      },
    });

    this.logger.log(`Initialized with model: ${this.modelName}`);
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const result = await this.embeddings.embedQuery(text);
      if (!result || !Array.isArray(result)) {
        throw new Error(
          `embedQuery returned invalid result: ${JSON.stringify(result)}`,
        );
      }
      return result;
    } catch (error) {
      this.logger.warn(
        `LangChain embedQuery failed, trying direct API call: ${error?.message || error}`,
      );
      const batch = await this.embedBatchDirect([text]);
      return batch[0];
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    this.logger.debug(`Embedding batch of ${texts.length} texts...`);

    // Try LangChain first, fall back to direct API call on failure
    try {
      const result = await this.embeddings.embedDocuments(texts);

      this.logger.debug(
        `Received ${result?.length || 0} embeddings from LangChain`,
      );

      if (!result || !Array.isArray(result)) {
        throw new Error(
          `embedDocuments returned invalid result: ${JSON.stringify(result)}`,
        );
      }
      if (result.length !== texts.length) {
        throw new Error(
          `embedDocuments returned ${result.length} embeddings for ${texts.length} texts`,
        );
      }

      // Validate each embedding
      for (let i = 0; i < result.length; i++) {
        if (!result[i] || !Array.isArray(result[i])) {
          throw new Error(
            `Embedding at index ${i} is invalid: ${JSON.stringify(result[i])}`,
          );
        }
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `LangChain embedDocuments failed, trying direct API call: ${error?.message || error}`,
      );
      return this.embedBatchDirect(texts);
    }
  }

  private async embedBatchDirect(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://unionhub.cisl.it",
          "X-Title": "UnionHub RAG",
        },
        body: JSON.stringify({
          model: this.modelName,
          input: texts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error: ${response.status} ${errorText}`,
        );
      }

      const data: OpenRouterEmbeddingResponse = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error(
          `Invalid response from OpenRouter: ${JSON.stringify(data)}`,
        );
      }

      if (data.data.length !== texts.length) {
        throw new Error(
          `OpenRouter returned ${data.data.length} embeddings for ${texts.length} texts`,
        );
      }

      // Sort by index to ensure correct order
      const sorted = data.data.sort((a, b) => a.index - b.index);
      const embeddings = sorted.map((item) => item.embedding);

      this.logger.debug(
        `Generated ${embeddings.length} embeddings via direct API`,
      );
      return embeddings;
    } catch (error) {
      this.logger.error(
        `Direct API embed batch failed: ${error?.message || error}`,
      );
      this.logger.error(
        `Input texts count: ${texts.length}, first text preview: ${texts[0]?.substring(0, 100)}...`,
      );
      throw error;
    }
  }

  getDimensions(): number {
    // text-embedding-3-small = 1536, text-embedding-3-large = 3072
    if (this.modelName.includes("3-small")) return 1536;
    if (this.modelName.includes("3-large")) return 3072;
    return 1536; // default fallback
  }
}
