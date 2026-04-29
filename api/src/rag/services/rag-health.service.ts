import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { LangChainEmbeddingsService } from "./langchain-embeddings.service";
import { CohereRerankService } from "./cohere-rerank.service";
import { VisionTableExtractorService } from "./vision/vision-table-extractor.service";
import { AiService } from "../../ai/ai.service";

export interface RagHealthStatus {
  redis: boolean;
  embeddings: boolean;
  pgvector: boolean;
  reranker: boolean;
  visionTables: boolean;
  ai: boolean;
  overall: boolean;
}

@Injectable()
export class RagHealthService {
  private readonly logger = new Logger(RagHealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingsService: LangChainEmbeddingsService,
    private readonly rerankService: CohereRerankService,
    private readonly visionTableExtractor: VisionTableExtractorService,
    private readonly aiService: AiService,
  ) {}

  async check(): Promise<RagHealthStatus> {
    const [pgvector, embeddings, reranker, visionTables, ai] =
      await Promise.all([
        this.checkPgvector(),
        this.checkEmbeddings(),
        this.checkReranker(),
        this.checkVisionTables(),
        this.checkAi(),
      ]);

    const overall = pgvector && embeddings;

    return {
      redis: true, // If NestJS is running, BullMQ connected (it throws on startup if Redis is down)
      embeddings,
      pgvector,
      reranker,
      visionTables,
      ai,
      overall,
    };
  }

  private async checkPgvector(): Promise<boolean> {
    try {
      const result: Array<{ extname: string }> = await this.dataSource.query(
        `SELECT extname FROM pg_extension WHERE extname = 'vector'`,
      );
      return result.length > 0;
    } catch (err: any) {
      this.logger.warn("pgvector check failed:", err.message);
      return false;
    }
  }

  private async checkEmbeddings(): Promise<boolean> {
    try {
      // Test embeddings by generating a simple embedding
      const testVector = await this.embeddingsService.embedText("test");
      return Array.isArray(testVector) && testVector.length > 0;
    } catch (err: any) {
      this.logger.warn("embeddings check failed:", err.message);
      return false;
    }
  }

  private async checkAi(): Promise<boolean> {
    try {
      // Generate a trivial response to verify AI service is reachable
      await this.aiService.generate("ping");
      return true;
    } catch {
      return false;
    }
  }

  private async checkReranker(): Promise<boolean> {
    try {
      return await this.rerankService.healthCheck();
    } catch (err: any) {
      this.logger.warn("reranker check failed:", err.message);
      return false;
    }
  }

  private async checkVisionTables(): Promise<boolean> {
    try {
      return await this.visionTableExtractor.healthCheck();
    } catch (err: any) {
      this.logger.warn("vision table extractor check failed:", err.message);
      return false;
    }
  }
}
