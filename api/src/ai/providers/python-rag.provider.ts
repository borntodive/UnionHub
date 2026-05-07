import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface EmbedResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

interface RerankResult {
  index: number;
  score: number;
  text: string;
}

interface RerankResponse {
  results: RerankResult[];
}

@Injectable()
export class PythonRagProvider implements OnModuleInit {
  private readonly logger = new Logger(PythonRagProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      config.get<string>("PYTHON_RAG_URL") ?? "http://localhost:8001";
  }

  async onModuleInit(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        this.logger.log(`Python RAG service ready at ${this.baseUrl}`);
      } else {
        this.logger.warn(`Python RAG service unhealthy (${res.status})`);
      }
    } catch {
      this.logger.warn(
        `Python RAG service not reachable at ${this.baseUrl} — embeddings will fail`,
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embed/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, model: "BAAI/bge-m3" }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Python embed failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as EmbedResponse;
    return data.embeddings;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async rerank(
    query: string,
    passages: string[],
    topK: number = 5,
  ): Promise<RerankResult[]> {
    const res = await fetch(`${this.baseUrl}/rerank`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, passages, top_k: topK }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Python rerank failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as RerankResponse;
    return data.results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
