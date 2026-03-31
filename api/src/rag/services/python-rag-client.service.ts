import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ParsePdfResult {
  document_id: string;
  page_count: number;
  sections: Array<{
    title: string;
    code: string | null;
    page_start: number;
    page_end: number;
    text: string;
  }>;
  tables: Array<{
    page: number;
    section_code: string | null;
    section_title: string | null;
    headers: string[];
    rows: string[][];
    caption: string | null;
  }>;
}

export interface ChunkItem {
  section_code: string | null;
  section_title: string | null;
  page_start: number | null;
  page_end: number | null;
  chunk_type: string;
  chunk_index: number;
  text_content: string;
  table_json: object | null;
  token_count: number;
}

export interface ChunkBuildResult {
  document_id: string;
  chunks: ChunkItem[];
}

export interface RerankResult {
  index: number;
  score: number;
  text: string;
}

@Injectable()
export class PythonRagClientService {
  private readonly logger = new Logger(PythonRagClientService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly hostUploadPrefix: string;
  private readonly containerUploadPrefix: string;

  constructor(private configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>("PYTHON_RAG_URL") ||
      "http://localhost:8001";
    this.timeoutMs =
      this.configService.get<number>("PYTHON_RAG_TIMEOUT_MS") || 120_000;
    // Path mapping: transform host paths to container paths for Docker
    this.hostUploadPrefix =
      this.configService.get<string>("UPLOAD_HOST_PREFIX") ||
      // Default: detect based on CWD pattern or use common development paths
      this.detectUploadPrefix();
    this.containerUploadPrefix =
      this.configService.get<string>("UPLOAD_CONTAINER_PREFIX") ||
      "/data/rag-docs";
  }

  private detectUploadPrefix(): string {
    // In development, uploads are typically in api/uploads relative to project root
    // Try to detect the absolute path pattern
    const cwd = process.cwd();
    // If running from api/ directory, uploads are in ./uploads
    // If running from project root, uploads are in ./api/uploads
    if (cwd.includes("/api") || cwd.endsWith("\\api")) {
      return cwd + "/uploads/rag-docs";
    }
    // Assume project root
    return cwd + "/api/uploads/rag-docs";
  }

  private mapPathToContainer(filePath: string): string {
    // Transform host path to container path
    // Example: /Users/.../api/uploads/rag-docs/file.pdf -> /data/rag-docs/file.pdf
    if (filePath.startsWith(this.hostUploadPrefix)) {
      const relativePath = filePath.slice(this.hostUploadPrefix.length);
      return this.containerUploadPrefix + relativePath;
    }
    // If it already looks like a container path, return as-is
    if (filePath.startsWith("/data/")) {
      return filePath;
    }
    // Fallback: just return the basename if we can't map it
    const basename = filePath.split("/").pop() || filePath;
    return `${this.containerUploadPrefix}/${basename}`;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new InternalServerErrorException(
          `Python RAG service error [${res.status}]: ${detail}`,
        );
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new ServiceUnavailableException(
          `Python RAG service timeout after ${this.timeoutMs}ms`,
        );
      }
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error("Python RAG service unreachable:", err.message);
      throw new ServiceUnavailableException(
        "Python RAG service is unavailable",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async parsePdf(
    filePath: string,
    documentId: string,
  ): Promise<ParsePdfResult> {
    const containerPath = this.mapPathToContainer(filePath);
    this.logger.debug(`Mapping path: ${filePath} -> ${containerPath}`);
    return this.post<ParsePdfResult>("/parse/pdf", {
      file_path: containerPath,
      document_id: documentId,
    });
  }

  async buildChunks(
    documentId: string,
    sections: ParsePdfResult["sections"],
    tables: ParsePdfResult["tables"],
    chunkSize = 512,
    chunkOverlap = 64,
  ): Promise<ChunkBuildResult> {
    return this.post<ChunkBuildResult>("/chunk/build", {
      document_id: documentId,
      sections,
      tables,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
    });
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await this.post<{ embeddings: number[][] }>("/embed/batch", {
      texts,
    });
    return res.embeddings;
  }

  async rerank(
    query: string,
    passages: string[],
    topK: number,
  ): Promise<RerankResult[]> {
    const res = await this.post<{ results: RerankResult[] }>("/rerank", {
      query,
      passages,
      top_k: topK,
    });
    return res.results;
  }

  async healthCheck(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
