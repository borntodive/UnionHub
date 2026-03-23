import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { ChatMessage } from "./entities/chat-message.entity";
import {
  KnowledgeBaseService,
  ChunkWithSource,
} from "../knowledge-base/knowledge-base.service";
import { OllamaService } from "../ollama/ollama.service";
import { UserRole } from "../common/enums/user-role.enum";

interface JwtUser {
  userId: string;
  role: UserRole;
  ruolo?: string | null;
}

export interface ChatResponse {
  response: string;
  sources: Array<{ title: string; accessLevel: string }>;
  conversationId: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly chunksLimit: number;
  private readonly contextMessages: number;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    private readonly kbService: KnowledgeBaseService,
    private readonly ollamaService: OllamaService,
    private readonly configService: ConfigService,
  ) {
    this.chunksLimit = parseInt(
      this.configService.get<string>("CHATBOT_CHUNKS_LIMIT", "5"),
      10,
    );
    this.contextMessages = parseInt(
      this.configService.get<string>("CHATBOT_CONTEXT_MESSAGES", "10"),
      10,
    );
  }

  async chat(
    message: string,
    conversationId: string,
    user: JwtUser,
  ): Promise<ChatResponse> {
    // 1. Determine access level from role
    const accessLevel: "all" | "admin" =
      user.role === UserRole.USER ? "all" : "admin";

    // 2. Retrieve relevant chunks via semantic search
    let chunks: ChunkWithSource[] = [];
    try {
      chunks = await this.kbService.semanticSearch(
        message,
        accessLevel,
        user.ruolo ?? null,
        this.chunksLimit,
      );
    } catch (err) {
      this.logger.warn(
        "Semantic search failed, proceeding without context:",
        err.message,
      );
    }

    // 3. Fetch recent conversation history for context
    const history = await this.msgRepo.find({
      where: { userId: user.userId, conversationId },
      order: { createdAt: "ASC" },
      take: this.contextMessages,
    });

    // 4. Build context block from retrieved chunks
    const contextBlock = chunks.length
      ? chunks
          .map((c) => `[Document: "${c.documentTitle}"]\n${c.content}`)
          .join("\n\n---\n\n")
      : "";

    // 5. Build conversation history block
    const historyBlock = history
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    // 6. System prompt
    const systemPrompt = `You are an AI assistant for CISL union members at Malta Air.
Answer questions ONLY using the information provided in the CONTEXT section below.
If the answer is not contained in the context, respond: "Non ho informazioni su questo argomento nella mia knowledge base." (or the equivalent in the user's language).
Always respond in the same language the user is using.
When referencing specific information, cite the document title in parentheses.
Be concise and precise.

${contextBlock ? `CONTEXT:\n${contextBlock}` : "CONTEXT: (no relevant documents found)"}`;

    // 7. Build full prompt (history + current message)
    const fullPrompt = historyBlock
      ? `${historyBlock}\nUser: ${message}\nAssistant:`
      : `User: ${message}\nAssistant:`;

    // 8. Call Ollama chatbot model
    let responseText: string;
    try {
      responseText = await this.ollamaService.chatGenerate(
        fullPrompt,
        systemPrompt,
      );
    } catch (err) {
      this.logger.error("Ollama chatbot generation failed:", err.message);
      responseText =
        "Si è verificato un errore durante la generazione della risposta. Riprova tra qualche istante.";
    }

    // 9. Persist both messages
    await this.msgRepo.save([
      this.msgRepo.create({
        userId: user.userId,
        conversationId,
        role: "user",
        content: message,
      }),
      this.msgRepo.create({
        userId: user.userId,
        conversationId,
        role: "assistant",
        content: responseText,
      }),
    ]);

    // 10. Deduplicate sources
    const seen = new Set<string>();
    const sources = chunks
      .filter((c) => {
        if (seen.has(c.documentId)) return false;
        seen.add(c.documentId);
        return true;
      })
      .map((c) => ({ title: c.documentTitle, accessLevel: c.accessLevel }));

    return { response: responseText, sources, conversationId };
  }

  async getHistory(
    conversationId: string,
    userId: string,
  ): Promise<ChatMessage[]> {
    return this.msgRepo.find({
      where: { conversationId, userId },
      order: { createdAt: "ASC" },
    });
  }

  async clearHistory(conversationId: string, userId: string): Promise<void> {
    await this.msgRepo.delete({ conversationId, userId });
  }
}
