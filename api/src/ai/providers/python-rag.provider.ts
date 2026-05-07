import * as http from "node:http";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { type AxiosInstance } from "axios";

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
  private readonly http: AxiosInstance;
  private readonly embedTimeoutMs: number;

  constructor(private readonly config: ConfigService) {
    const baseUrl =
      config.get<string>("PYTHON_RAG_URL") ?? "http://127.0.0.1:8001";
    this.embedTimeoutMs = parseInt(
      config.get<string>("PYTHON_RAG_TIMEOUT_MS") ?? "600000",
      10,
    );
    this.http = axios.create({
      baseURL: baseUrl,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      httpAgent: new http.Agent({ keepAlive: false }),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.http.get("/health", { timeout: 3000 });
      this.logger.log(
        `Python RAG service ready at ${this.http.defaults.baseURL}`,
      );
    } catch {
      this.logger.warn(
        `Python RAG service not reachable at ${this.http.defaults.baseURL} — embeddings will fail`,
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    this.logger.debug(`embedBatch: ${texts.length} texts`);
    const { data } = await this.http.post<EmbedResponse>(
      "/embed/batch",
      {
        texts,
        model: "BAAI/bge-m3",
      },
      { timeout: this.embedTimeoutMs },
    );
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
    const { data } = await this.http.post<RerankResponse>(
      "/rerank",
      {
        query,
        passages,
        top_k: topK,
      },
      { timeout: 30_000 },
    );
    return data.results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.http.get("/health", { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
