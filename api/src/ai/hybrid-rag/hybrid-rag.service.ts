import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios, { AxiosInstance } from "axios";
import { promises as fs } from "fs";
import { join } from "path";
import { ChatRequest } from "./entities/chat-request.entity";
import { Ruolo } from "../../common/enums/ruolo.enum";
import { UserRole } from "../../common/enums/user-role.enum";

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

export interface IngestDocumentResult {
  filename: string;
  status: string;
  title?: string;
  document_id?: number;
  sections?: number;
  reason?: string;
}

export interface IngestResponse {
  total: number;
  ingested: number;
  skipped: number;
  failed: number;
  documents: IngestDocumentResult[];
}

@Injectable()
export class HybridRagService implements OnModuleInit {
  private readonly logger = new Logger(HybridRagService.name);
  private readonly http: AxiosInstance;
  readonly kbDir: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ChatRequest)
    private readonly chatRequestRepo: Repository<ChatRequest>,
  ) {
    const baseUrl =
      config.get<string>("HYBRID_RAG_URL") ?? "http://127.0.0.1:8000";
    const apiKey = config.get<string>("HYBRID_RAG_API_KEY") ?? "";
    this.kbDir = config.get<string>("HYBRID_RAG_KB_DIR") ?? "./kb_data";

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

  async saveChatRequest(
    userId: string | null,
    question: string,
    answer: string,
    citations: Citation[],
  ): Promise<ChatRequest> {
    const entity = this.chatRequestRepo.create({
      userId,
      question,
      answer,
      citations: citations ?? [],
    });
    return this.chatRequestRepo.save(entity);
  }

  async listChatRequests(requestingUser: {
    role: UserRole;
    ruolo?: Ruolo;
  }): Promise<ChatRequest[]> {
    const qb = this.chatRequestRepo
      .createQueryBuilder("chat")
      .leftJoinAndSelect("chat.user", "user")
      .orderBy("chat.createdAt", "DESC");

    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      qb.where("user.ruolo = :ruolo", { ruolo: requestingUser.ruolo });
    }

    return qb.getMany();
  }

  async findChatRequestById(
    id: string,
    requestingUser: { role: UserRole; ruolo?: Ruolo },
  ): Promise<ChatRequest> {
    const chat = await this.chatRequestRepo.findOne({
      where: { id },
      relations: ["user"],
    });
    if (!chat) throw new NotFoundException("Chat request not found");

    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      const userRuolo = (chat.user as { ruolo?: Ruolo } | null)?.ruolo;
      if (userRuolo && userRuolo !== requestingUser.ruolo) {
        throw new NotFoundException("Chat request not found");
      }
    }

    return chat;
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

  async ingest(force = false): Promise<IngestResponse> {
    const dir = encodeURIComponent(this.kbDir);
    const { data } = await this.http.post<IngestResponse>(
      `/ingest?directory=${dir}&force=${force}`,
      null,
      { timeout: 300_000 },
    );
    return data;
  }

  async saveKbFiles(
    files: Express.Multer.File[],
  ): Promise<{ filename: string; size: number }[]> {
    await fs.mkdir(this.kbDir, { recursive: true });
    const results: { filename: string; size: number }[] = [];
    for (const file of files) {
      const dest = join(this.kbDir, file.originalname);
      await fs.writeFile(dest, file.buffer);
      this.logger.log(`KB file saved: ${dest}`);
      results.push({ filename: file.originalname, size: file.size });
    }
    return results;
  }
}
