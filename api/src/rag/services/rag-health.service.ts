import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PythonRagClientService } from "./python-rag-client.service";
import { OllamaService } from "../../ollama/ollama.service";

export interface RagHealthStatus {
  redis: boolean;
  pythonService: boolean;
  pgvector: boolean;
  ollama: boolean;
  overall: boolean;
}

@Injectable()
export class RagHealthService {
  private readonly logger = new Logger(RagHealthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly pythonClient: PythonRagClientService,
    private readonly ollamaService: OllamaService,
  ) {}

  async check(): Promise<RagHealthStatus> {
    const [pgvector, python, ollama] = await Promise.all([
      this.checkPgvector(),
      this.pythonClient.healthCheck(),
      this.checkOllama(),
    ]);

    const overall = pgvector && python;

    return {
      redis: true, // If NestJS is running, BullMQ connected (it throws on startup if Redis is down)
      pythonService: python,
      pgvector,
      ollama,
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

  private async checkOllama(): Promise<boolean> {
    try {
      // generate a trivial response to verify Ollama is reachable
      await this.ollamaService.generate("ping");
      return true;
    } catch {
      return false;
    }
  }
}
