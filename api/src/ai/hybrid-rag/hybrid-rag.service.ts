import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface Citation {
  document_title: string;
  section: string;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
}

export interface KbDocument {
  id: number;
  title: string;
  section_count: number;
}

@Injectable()
export class HybridRagService implements OnModuleInit {
  private readonly logger = new Logger(HybridRagService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseUrl =
      config.get<string>("HYBRID_RAG_URL") ?? "http://127.0.0.1:8000";
    const apiKey = config.get<string>("HYBRID_RAG_API_KEY") ?? "";

    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 60_000,
      headers: apiKey ? { "X-API-Key": apiKey } : {},
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.http.get("/health");
      this.logger.log(
        `Hybrid RAG service ready at ${this.http.defaults.baseURL}`,
      );
    } catch {
      this.logger.warn(
        `Hybrid RAG service not reachable at ${this.http.defaults.baseURL}`,
      );
    }
  }

  async ask(question: string): Promise<AskResponse> {
    const { data } = await this.http.post<AskResponse>("/ask", { question });
    return data;
  }

  async listDocuments(): Promise<KbDocument[]> {
    const { data } = await this.http.get<{ documents: KbDocument[] }>(
      "/documents",
    );
    return data.documents;
  }

  async healthCheck(): Promise<{ status: string; kb_documents: number }> {
    const { data } = await this.http.get("/health");
    return data;
  }
}
