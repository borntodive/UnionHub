import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OllamaService } from "../../ollama/ollama.service";
import { SearchService, ScoredChunk } from "./search.service";
import { PythonRagClientService } from "./python-rag-client.service";
import { RagDocumentService } from "./rag-document.service";
import { QueryLog } from "../entities/query-log.entity";
import { AskQueryDto, RetrievalMode } from "../dto/ask-query.dto";
import { SearchQueryDto } from "../dto/search-query.dto";

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionCode: string | null;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
}

export interface AskResponse {
  answer: string;
  rewrittenQuestion: string;
  citations: Citation[];
  retrievalMode: string;
}

const ANSWER_SYSTEM_PROMPT = `
You answer only using the provided context.
If the answer is not fully supported by the context, say so clearly.
Prefer exact operational wording when the context is procedural.
Always return citations with document title, section code, section title, and pages.
If the context includes a table, use the table as the primary source.
Do not invent policy, limits, or procedures.
`.trim();

const TABLE_ANSWER_PROMPT = `
When a table is present in the context:
- preserve row-to-column meaning
- do not merge adjacent rows
- state explicitly if multiple rows apply
- avoid paraphrasing away thresholds or categories
`.trim();

@Injectable()
export class RagQueryService {
  private readonly logger = new Logger(RagQueryService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly searchService: SearchService,
    private readonly pythonClient: PythonRagClientService,
    private readonly ragDocumentService: RagDocumentService,
    @InjectRepository(QueryLog)
    private readonly queryLogRepo: Repository<QueryLog>,
  ) {}

  async ask(dto: AskQueryDto): Promise<AskResponse> {
    const mode = dto.retrievalMode ?? RetrievalMode.HYBRID;
    const topK = dto.topK ?? 8;
    const maxContext = dto.maxContextChunks ?? 6;

    // 1. Query rewriting for better retrieval
    let rewrittenQuestion = dto.question;
    try {
      rewrittenQuestion = await this.ollamaService.generate(
        `Rewrite the following question to maximize retrieval from an aviation operations manual. Be concise and use technical terminology. Return only the rewritten question.\n\nQuestion: ${dto.question}\n\nRewritten:`,
      );
    } catch (err: any) {
      this.logger.warn("Query rewrite failed, using original:", err.message);
    }

    // 2. Retrieve chunks
    const retrieved = await this.searchService.search(
      rewrittenQuestion,
      dto.documentIds,
      topK,
      mode,
    );

    // 3. Rerank if there are candidates
    let ranked = retrieved;
    if (retrieved.length > 1) {
      try {
        const rerankResults = await this.pythonClient.rerank(
          rewrittenQuestion,
          retrieved.map((c) => c.textContent),
          maxContext,
        );
        ranked = rerankResults.map((r) => retrieved[r.index]);
      } catch (err: any) {
        this.logger.warn("Reranking failed, using raw retrieval:", err.message);
        ranked = retrieved.slice(0, maxContext);
      }
    } else {
      ranked = retrieved.slice(0, maxContext);
    }

    // 4. Build context string
    const hasTable = ranked.some((c) => c.chunkType === "table");
    const contextBlocks = ranked.map((chunk) => {
      const loc = [
        chunk.sectionCode,
        chunk.sectionTitle,
        chunk.pageStart != null ? `p.${chunk.pageStart}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      if (chunk.chunkType === "table" && chunk.tableJson) {
        const t = chunk.tableJson as { headers?: string[]; rows?: string[][] };
        const header = (t.headers ?? []).join(" | ");
        const rows = (t.rows ?? []).map((r) => r.join(" | ")).join("\n");
        return `[${loc}]\n${chunk.textContent}\n${header}\n${rows}`;
      }
      return `[${loc}]\n${chunk.textContent}`;
    });

    const contextText = contextBlocks.join("\n\n---\n\n");

    const systemPrompt = hasTable
      ? `${ANSWER_SYSTEM_PROMPT}\n\n${TABLE_ANSWER_PROMPT}`
      : ANSWER_SYSTEM_PROMPT;

    const userPrompt = `Context:\n${contextText}\n\nQuestion: ${dto.question}\n\nAnswer:`;

    // 5. Generate answer
    let answer = "Unable to generate an answer from the available context.";
    try {
      answer = await this.ollamaService.generate(userPrompt, systemPrompt);
    } catch (err: any) {
      this.logger.error("Answer generation failed:", err.message);
    }

    // 6. Build citations
    const documentCache = new Map<string, string>();
    const citations: Citation[] = await Promise.all(
      ranked.map(async (chunk) => {
        let docTitle = documentCache.get(chunk.documentId) ?? "";
        if (!docTitle) {
          try {
            const doc = await this.ragDocumentService.findById(
              chunk.documentId,
            );
            docTitle = doc.title;
            documentCache.set(chunk.documentId, docTitle);
          } catch {
            docTitle = chunk.documentId;
          }
        }
        return {
          chunkId: chunk.chunkId,
          documentId: chunk.documentId,
          documentTitle: docTitle,
          sectionCode: chunk.sectionCode,
          sectionTitle: chunk.sectionTitle,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          quote: chunk.textContent.slice(0, 200),
        };
      }),
    );

    // 7. Persist query log
    const log = this.queryLogRepo.create({
      question: dto.question,
      rewrittenQuestion,
      retrievalMode: mode,
      documentIds: dto.documentIds ?? [],
    });
    await this.queryLogRepo
      .save(log)
      .catch((err) =>
        this.logger.warn("Failed to save query log:", err.message),
      );

    return { answer, rewrittenQuestion, citations, retrievalMode: mode };
  }

  async rawSearch(dto: SearchQueryDto): Promise<ScoredChunk[]> {
    const mode = dto.retrievalMode ?? RetrievalMode.HYBRID;
    return this.searchService.search(
      dto.query,
      dto.documentIds,
      dto.topK ?? 10,
      mode,
    );
  }
}
