import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (
  buffer: Buffer,
) => Promise<{ text: string }> = require("pdf-parse");
import { KnowledgeBaseDocument } from "./entities/knowledge-base-document.entity";
import { KnowledgeBaseChunk } from "./entities/knowledge-base-chunk.entity";
import { OllamaService } from "../ollama/ollama.service";
import { NotificationsService } from "../notifications/notifications.service";

const CHUNK_WORDS = 300;
const CHUNK_OVERLAP_WORDS = 30;
const CHUNK_MAX_CHARS = 2000; // nomic-embed-text context safety limit

export interface ChunkWithSource {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  accessLevel: string;
  content: string;
  distance: number;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeBaseDocument)
    private readonly docRepo: Repository<KnowledgeBaseDocument>,
    @InjectRepository(KnowledgeBaseChunk)
    private readonly chunkRepo: Repository<KnowledgeBaseChunk>,
    private readonly dataSource: DataSource,
    private readonly ollamaService: OllamaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Text chunking ────────────────────────────────────────────────────────

  private splitIntoChunks(text: string): string[] {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + CHUNK_WORDS, words.length);
      chunks.push(words.slice(start, end).join(" "));
      if (end === words.length) break;
      start += CHUNK_WORDS - CHUNK_OVERLAP_WORDS;
    }

    return chunks;
  }

  // ─── Upload & index ───────────────────────────────────────────────────────

  /**
   * Parse the PDF, persist the document record, then kick off background
   * indexing. Returns immediately with status='pending' so the HTTP request
   * does not time out during the (potentially long) embedding loop.
   */
  async uploadDocument(
    buffer: Buffer,
    filename: string,
    title: string,
    accessLevel: "all" | "admin",
    uploadedByUserId: string,
    ruolo?: string,
  ): Promise<KnowledgeBaseDocument> {
    // Extract text from PDF (fast, synchronous-ish)
    let extractedText: string;
    try {
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text.trim();
    } catch (err) {
      throw new BadRequestException(`Failed to parse PDF: ${err.message}`);
    }

    if (!extractedText) {
      throw new BadRequestException(
        "PDF appears to be empty or image-only (no extractable text).",
      );
    }

    // Persist document metadata with status=pending
    const doc = this.docRepo.create({
      title,
      filename,
      accessLevel,
      ruolo: ruolo ?? null,
      fileData: buffer,
      extractedText,
      chunkCount: 0,
      status: "pending",
    });
    await this.docRepo.save(doc);

    // Fire-and-forget background indexing
    this.indexDocumentBackground(doc, extractedText, uploadedByUserId).catch(
      (err) =>
        this.logger.error(
          `Background indexing failed for doc ${doc.id}: ${err.message}`,
        ),
    );

    return doc;
  }

  /** (Re)generate embeddings for an existing document */
  async reindexDocument(id: string, requestedByUserId?: string): Promise<void> {
    const doc = await this.dataSource
      .getRepository(KnowledgeBaseDocument)
      .createQueryBuilder("d")
      .addSelect("d.extractedText")
      .where("d.id = :id", { id })
      .getOne();

    if (!doc) throw new NotFoundException("Document not found");
    if (!doc.extractedText)
      throw new BadRequestException("No extracted text available for re-index");

    // Mark as pending so the UI can show progress
    await this.docRepo.update(id, { status: "pending", chunkCount: 0 });

    // Delete existing chunks
    await this.chunkRepo.delete({ document: { id } });

    // Fire-and-forget
    this.indexDocumentBackground(doc, doc.extractedText, requestedByUserId).catch(
      (err) =>
        this.logger.error(
          `Background re-index failed for doc ${id}: ${err.message}`,
        ),
    );
  }

  private async indexDocumentBackground(
    doc: KnowledgeBaseDocument,
    text: string,
    notifyUserId?: string,
  ): Promise<void> {
    const docId = doc.id;
    await this.docRepo.update(docId, { status: "indexing" });

    try {
      await this.indexDocument(doc, text);
      await this.docRepo.update(docId, { status: "ready" });

      if (notifyUserId) {
        await this.notificationsService.sendPushNotification(
          notifyUserId,
          "Knowledge Base",
          `"${doc.title}" è stato indicizzato con successo ed è ora disponibile per il chatbot.`,
          { type: "KB_INDEXED", documentId: docId },
        );
      }
    } catch (err) {
      this.logger.error(`Indexing error for doc ${docId}: ${err.message}`);
      await this.docRepo.update(docId, { status: "error" });

      if (notifyUserId) {
        await this.notificationsService.sendPushNotification(
          notifyUserId,
          "Knowledge Base",
          `Errore durante l'indicizzazione di "${doc.title}". Riprova.`,
          { type: "KB_INDEX_ERROR", documentId: docId },
        );
      }
    }
  }

  private async indexDocument(
    doc: KnowledgeBaseDocument,
    text: string,
  ): Promise<void> {
    // Capture the ID once to avoid TypeORM entity tracking issues
    // across many async Ollama calls in a long-running loop.
    const docId = doc.id;
    const chunks = this.splitIntoChunks(text);
    let indexed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i].slice(0, CHUNK_MAX_CHARS);
      const wordCount = content.split(/\s+/).length;

      try {
        const embedding = await this.ollamaService.generateEmbedding(content);

        // Use raw SQL for the chunk insert to guarantee document_id is set
        // correctly regardless of TypeORM's entity identity-map state.
        const rows: { id: string }[] = await this.dataSource.query(
          `INSERT INTO knowledge_base_chunks (id, document_id, chunk_index, content, token_count, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
           RETURNING id`,
          [docId, i, content, wordCount],
        );
        const chunkId = rows[0].id;

        // Set the vector embedding (pgvector)
        await this.dataSource.query(
          `UPDATE knowledge_base_chunks SET embedding = $1::vector WHERE id = $2`,
          [`[${embedding.join(",")}]`, chunkId],
        );

        indexed++;
      } catch (err) {
        this.logger.warn(`Failed to embed chunk ${i}: ${err.message}`);
      }
    }

    await this.docRepo.update(docId, { chunkCount: indexed });
    this.logger.log(
      `Indexed ${indexed}/${chunks.length} chunks for "${doc.title}"`,
    );
  }

  // ─── Semantic search ──────────────────────────────────────────────────────

  /**
   * Find the most relevant chunks for a query, filtered by access level.
   * @param accessLevel 'all' = user-accessible docs only; 'admin' = all docs
   */
  async semanticSearch(
    query: string,
    accessLevel: "all" | "admin",
    ruolo?: string | null,
    limit = 5,
  ): Promise<ChunkWithSource[]> {
    const embedding = await this.ollamaService.generateEmbedding(query);
    const vectorLiteral = `[${embedding.join(",")}]`;

    // Build access filter: admin can see everything; user sees only 'all'
    const accessFilter =
      accessLevel === "admin" ? "" : `AND d.access_level = 'all'`;

    // Build ruolo filter: admins see all ruoli; users see their role + global docs
    const ruoloFilter =
      accessLevel === "admin"
        ? ""
        : ruolo
          ? `AND (d.ruolo IS NULL OR d.ruolo = '${ruolo}')`
          : `AND d.ruolo IS NULL`;

    const rows: any[] = await this.dataSource.query(
      `SELECT
         c.id            AS "chunkId",
         c.content       AS "content",
         d.id            AS "documentId",
         d.title         AS "documentTitle",
         d.access_level  AS "accessLevel",
         c.embedding <=> $1::vector AS distance
       FROM knowledge_base_chunks c
       JOIN knowledge_base_documents d ON c.document_id = d.id
       WHERE c.embedding IS NOT NULL
         AND d.status = 'ready'
         ${accessFilter}
         ${ruoloFilter}
       ORDER BY distance ASC
       LIMIT $2`,
      [vectorLiteral, limit],
    );

    return rows;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  findAll(): Promise<KnowledgeBaseDocument[]> {
    return this.docRepo.find({ order: { createdAt: "DESC" } });
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException("Document not found");
    await this.docRepo.remove(doc);
  }
}
