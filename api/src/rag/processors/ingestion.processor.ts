import { Processor, WorkerHost } from "@nestjs/bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { IngestionJob } from "../entities/ingestion-job.entity";
import { IngestionStep } from "../entities/ingestion-step.entity";
import { Chunk } from "../entities/chunk.entity";
import { ChunkEmbedding } from "../entities/chunk-embedding.entity";
import { RagDocument } from "../entities/rag-document.entity";
import { IngestionStatus } from "../enums/ingestion-status.enum";
import { ChunkType } from "../enums/chunk-type.enum";
import { LangChainChunkerService } from "../services/langchain-chunker.service";
import { LangChainEmbeddingsService } from "../services/langchain-embeddings.service";
import { TableExtractorService } from "../services/vision/table-extractor.service";
import { VisionTableExtractorService } from "../services/vision/vision-table-extractor.service";
import { RAG_INGESTION_QUEUE } from "../constants";
import { NotificationsService } from "../../notifications/notifications.service";
const pdf = require("pdf-parse");

interface IngestionJobPayload {
  jobId: string;
  documentId: string;
}

@Processor(RAG_INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly chunkerService: LangChainChunkerService,
    private readonly embeddingsService: LangChainEmbeddingsService,
    private readonly tableExtractor: TableExtractorService,
    private readonly visionTableExtractor: VisionTableExtractorService,
    @InjectRepository(IngestionJob)
    private readonly ingestionJobRepo: Repository<IngestionJob>,
    @InjectRepository(IngestionStep)
    private readonly ingestionStepRepo: Repository<IngestionStep>,
    @InjectRepository(Chunk)
    private readonly chunkRepo: Repository<Chunk>,
    @InjectRepository(ChunkEmbedding)
    private readonly embeddingRepo: Repository<ChunkEmbedding>,
    @InjectRepository(RagDocument)
    private readonly ragDocumentRepo: Repository<RagDocument>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<IngestionJobPayload>): Promise<void> {
    const { jobId, documentId } = job.data;
    this.logger.log(
      `Starting ingestion job ${jobId} for document ${documentId}`,
    );

    const ingestionJob = await this.ingestionJobRepo.findOne({
      where: { id: jobId },
    });
    if (!ingestionJob) {
      this.logger.error(`Ingestion job ${jobId} not found`);
      return;
    }

    const document = await this.ragDocumentRepo.findOne({
      where: { id: documentId },
    });
    if (!document) {
      await this.failJob(
        ingestionJob,
        null,
        `Document ${documentId} not found`,
      );
      return;
    }

    ingestionJob.status = IngestionStatus.RUNNING;
    ingestionJob.startedAt = new Date();
    await this.ingestionJobRepo.save(ingestionJob);

    // Step 1: Parse PDF using pdf-parse
    const parseStep = await this.createStep(jobId, "parse");
    let pdfText: string;
    let pageCount: number;
    try {
      const fs = require("fs");
      const dataBuffer = fs.readFileSync(document.filePath);
      const data = (await pdf(dataBuffer)) as {
        text: string;
        numpages: number;
      };
      pdfText = data.text;
      pageCount = data.numpages;

      await this.completeStep(parseStep, {
        page_count: pageCount,
        text_length: pdfText.length,
      });
    } catch (err: any) {
      await this.failJob(ingestionJob, parseStep, err.message, document);
      return;
    }

    // Step 1.5: Extract tables using vision-based extractor (with heuristic fallback)
    const tableStep = await this.createStep(jobId, "extract_tables");
    let extractedTables: Awaited<
      ReturnType<VisionTableExtractorService["extractTablesFromPdf"]>
    > = [];
    let extractionMethod = "vision";

    try {
      // Try vision-based extraction first (more accurate for complex tables)
      this.logger.log("Attempting vision-based table extraction...");
      extractedTables = await this.visionTableExtractor.extractTablesFromPdf(
        document.filePath,
        {
          maxPages: Math.min(pageCount, 100), // Limit for performance
          skipHeuristic: false,
        },
      );
    } catch (visionErr: any) {
      this.logger.warn(
        `Vision-based table extraction failed: ${visionErr.message}, falling back to heuristic extraction`,
      );

      try {
        // Fallback to heuristic extraction
        extractionMethod = "heuristic";
        extractedTables = await this.tableExtractor.extractTablesFromPdf(
          document.filePath,
          Math.min(pageCount, 100),
        );
      } catch (heuristicErr: any) {
        this.logger.warn(
          `Heuristic table extraction also failed: ${heuristicErr.message}`,
        );
      }
    }

    if (extractedTables.length > 0) {
      await this.completeStep(tableStep, {
        table_count: extractedTables.length,
        method: extractionMethod,
      });
      this.logger.log(
        `Extracted ${extractedTables.length} tables using ${extractionMethod} method`,
      );
    } else {
      await this.failStep(tableStep, "No tables detected");
    }

    // Step 2: Build chunks using LangChain + extracted tables
    const chunkStep = await this.createStep(jobId, "chunk");
    let chunkEntities: Chunk[];
    try {
      // Use LangChain chunker to split text
      const chunkItems = await this.chunkerService.splitSection(
        pdfText,
        null, // sectionCode - not available in simplified parsing
        document.title,
        null, // pageStart - not tracked in simplified parsing
        null, // pageEnd
      );

      // Delete existing chunks for this document (re-ingestion scenario)
      await this.chunkRepo.delete({ documentId });

      chunkEntities = [];

      // Create text chunks
      let chunkIndex = 0;
      for (const c of chunkItems) {
        chunkEntities.push(
          this.chunkRepo.create({
            documentId,
            sectionCode: c.sectionCode,
            sectionTitle: c.sectionTitle || document.title,
            pageStart: c.pageStart,
            pageEnd: c.pageEnd,
            chunkType: ChunkType.TEXT,
            chunkIndex: chunkIndex++,
            textContent: c.textContent,
            tableJson: null,
            metadata: {},
            tokenCount: c.tokenCount,
          }),
        );
      }

      // Create table chunks from extracted tables
      for (const table of extractedTables) {
        const tableText = this.formatTableAsText(table);

        chunkEntities.push(
          this.chunkRepo.create({
            documentId,
            sectionCode: null,
            sectionTitle: `Tabella (pagina ${table.pageIndex + 1})`,
            pageStart: table.pageIndex + 1,
            pageEnd: table.pageIndex + 1,
            chunkType: ChunkType.TABLE,
            chunkIndex: chunkIndex++,
            textContent: tableText,
            tableJson: {
              headers: table.headers,
              rows: table.rows,
              confidence: table.confidence,
            },
            metadata: { isTable: true, pageIndex: table.pageIndex },
            tokenCount: Math.ceil(tableText.length / 4),
          }),
        );
      }

      this.logger.log(
        `Created ${chunkEntities.length} chunks (${chunkItems.length} text + ${extractedTables.length} tables)`,
      );

      await this.chunkRepo.save(chunkEntities, { chunk: 100 });
      await this.completeStep(chunkStep, {
        chunk_count: chunkEntities.length,
        text_chunks: chunkItems.length,
        table_chunks: extractedTables.length,
      });
    } catch (err: any) {
      await this.failJob(ingestionJob, chunkStep, err.message, document);
      return;
    }

    // Step 3: Embed chunks using LangChain + OpenRouter
    const embedStep = await this.createStep(jobId, "embed");
    try {
      const savedChunks = await this.chunkRepo.find({
        where: { documentId },
        order: { chunkIndex: "ASC" },
      });

      const batchSize = 32; // Fixed batch size for OpenRouter
      const embeddingEntities: ChunkEmbedding[] = [];
      const modelName = "text-embedding-3-small";

      embedStep.progressTotal = savedChunks.length;
      embedStep.progressCurrent = 0;
      await this.ingestionStepRepo.save(embedStep);

      for (let i = 0; i < savedChunks.length; i += batchSize) {
        const batch = savedChunks.slice(i, i + batchSize);

        // Filter out chunks with empty/invalid text
        const validChunks = batch.filter(
          (c) => c.textContent && c.textContent.trim().length > 0,
        );

        if (validChunks.length === 0) {
          this.logger.warn(`Batch ${i} has no valid texts, skipping`);
          continue;
        }

        const texts = validChunks.map((c) => c.textContent);
        const vectors = await this.embeddingsService.embedBatch(texts);

        for (let j = 0; j < validChunks.length; j++) {
          embeddingEntities.push(
            this.embeddingRepo.create({
              chunkId: validChunks[j].id,
              embedding: vectors[j],
              model: modelName,
            }),
          );
        }

        embedStep.progressCurrent = Math.min(i + batchSize, savedChunks.length);
        await this.ingestionStepRepo.save(embedStep);
      }

      // Delete existing embeddings for this document's chunks then bulk-insert
      const chunkIds = savedChunks.map((c) => c.id);
      if (chunkIds.length > 0) {
        await this.embeddingRepo.delete(
          chunkIds.map((id) => ({ chunkId: id })),
        );
      }
      await this.embeddingRepo.save(embeddingEntities, { chunk: 50 });

      await this.completeStep(embedStep, {
        embedding_count: embeddingEntities.length,
        model: modelName,
      });
    } catch (err: any) {
      await this.failJob(ingestionJob, embedStep, err.message, document);
      return;
    }

    // Step 4: Ensure IVFFlat index exists (created after first data load)
    const indexStep = await this.createStep(jobId, "index");
    try {
      const indexExists: Array<{ indexname: string }> = await this.dataSource
        .query(`
          SELECT indexname FROM pg_indexes
          WHERE tablename = 'chunk_embeddings'
          AND indexname = 'IDX_chunk_emb_ivfflat'
        `);

      if (indexExists.length === 0) {
        this.logger.log("Creating IVFFlat index on chunk_embeddings…");
        await this.dataSource.query(`
          CREATE INDEX "IDX_chunk_emb_ivfflat"
          ON "chunk_embeddings"
          USING ivfflat ("embedding" vector_cosine_ops)
          WITH (lists = 100)
        `);
        this.logger.log("IVFFlat index created.");
      }

      await this.completeStep(indexStep, {
        index_created: indexExists.length === 0,
      });
    } catch (err: any) {
      // Non-fatal: indexing failure should not mark the whole job as failed
      this.logger.warn("IVFFlat index step failed (non-fatal):", err.message);
      await this.failStep(indexStep, err.message);
    }

    // Finish job
    ingestionJob.status = IngestionStatus.COMPLETED;
    ingestionJob.finishedAt = new Date();
    await this.ingestionJobRepo.save(ingestionJob);
    this.logger.log(`Ingestion job ${jobId} completed.`);

    // Notify admins
    try {
      await this.notificationsService.broadcastNotification(
        "RAG Ingestion Complete",
        `Document "${document.code}" has been indexed and is now searchable.`,
        {
          type: "RAG_INGESTION_COMPLETED",
          documentId: document.id,
          code: document.code,
        },
      );
    } catch (notifyErr: any) {
      this.logger.warn(
        "Failed to send ingestion completion notification:",
        notifyErr.message,
      );
    }
  }

  private async createStep(
    jobId: string,
    stepName: string,
  ): Promise<IngestionStep> {
    const step = this.ingestionStepRepo.create({
      jobId,
      stepName,
      status: IngestionStatus.RUNNING,
    });
    return this.ingestionStepRepo.save(step);
  }

  private async completeStep(
    step: IngestionStep,
    payload: object,
  ): Promise<void> {
    step.status = IngestionStatus.COMPLETED;
    step.payload = payload;
    await this.ingestionStepRepo.save(step);
  }

  private async failStep(
    step: IngestionStep,
    errorMessage: string,
  ): Promise<void> {
    step.status = IngestionStatus.FAILED;
    step.errorMessage = errorMessage;
    await this.ingestionStepRepo.save(step);
  }

  private async failJob(
    job: IngestionJob,
    step: IngestionStep | null,
    errorMessage: string,
    document?: RagDocument,
  ): Promise<void> {
    if (step) {
      await this.failStep(step, errorMessage);
    }
    job.status = IngestionStatus.FAILED;
    job.finishedAt = new Date();
    job.errorMessage = errorMessage;
    await this.ingestionJobRepo.save(job);
    this.logger.error(`Ingestion job ${job.id} failed: ${errorMessage}`);

    // Notify admins if we have document info
    if (document) {
      try {
        await this.notificationsService.broadcastNotification(
          "RAG Ingestion Failed",
          `Document "${document.code}" indexing failed. Tap to retry.`,
          {
            type: "RAG_INGESTION_FAILED",
            documentId: document.id,
            code: document.code,
          },
        );
      } catch (notifyErr: any) {
        this.logger.warn(
          "Failed to send ingestion failure notification:",
          notifyErr.message,
        );
      }
    }
  }

  /**
   * Format a table as readable text for embedding and display.
   */
  private formatTableAsText(table: {
    headers: string[];
    rows: string[][];
  }): string {
    const lines: string[] = [];

    // Add headers
    lines.push(`| ${table.headers.join(" | ")} |`);
    lines.push(`| ${table.headers.map(() => "---").join(" | ")} |`);

    // Add rows
    for (const row of table.rows) {
      lines.push(`| ${row.join(" | ")} |`);
    }

    return lines.join("\n");
  }
}
