import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { KbIngestionService, IngestProgress } from "./kb-ingestion.service";
import { KbRetrievalService } from "./kb-retrieval.service";
import { KbGenerationService, GenerationResult } from "./kb-generation.service";
import { PythonRagProvider } from "../providers/python-rag.provider";

export interface AskResult {
  answer: string;
  sources: string[];
}

export interface KbStatus {
  totalPages: number;
  pythonServiceReady: boolean;
}

export interface IngestStartResult {
  started: boolean;
  message: string;
}

@Injectable()
export class KbService {
  private readonly logger = new Logger(KbService.name);

  constructor(
    private readonly ingestion: KbIngestionService,
    private readonly retrieval: KbRetrievalService,
    private readonly generation: KbGenerationService,
    private readonly pythonRag: PythonRagProvider,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async ask(
    question: string,
    history: Array<{ role: "user" | "assistant"; content: string }> = [],
    userId?: string,
  ): Promise<AskResult> {
    const context = await this.retrieval.retrieve(question);

    if (context.length === 0) {
      return {
        answer:
          "Mi dispiace, non ho trovato informazioni pertinenti nella base di conoscenza per rispondere alla tua domanda.",
        sources: [],
      };
    }

    const result: GenerationResult = await this.generation.generate(
      question,
      context,
      history,
      userId,
    );

    return { answer: result.answer, sources: result.sources };
  }

  ingest(): IngestStartResult {
    const started = this.ingestion.startIngest();
    return {
      started,
      message: started ? "Ingest avviato" : "Ingest già in corso",
    };
  }

  getIngestProgress(): IngestProgress {
    return this.ingestion.getProgress();
  }

  async getStatus(): Promise<KbStatus> {
    const rows = await this.db.query(
      `SELECT COUNT(*) AS count FROM wiki_pages WHERE embedding IS NOT NULL`,
    );
    return {
      totalPages: parseInt(rows[0]?.count ?? "0", 10),
      pythonServiceReady: await this.pythonRag.healthCheck(),
    };
  }
}
