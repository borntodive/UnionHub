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
import { PythonRagClientService } from "../services/python-rag-client.service";
import { RAG_INGESTION_QUEUE } from "../constants";
import { NotificationsService } from "../../notifications/notifications.service";

interface IngestionJobPayload {
  jobId: string;
  documentId: string;
}

@Processor(RAG_INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly pythonClient: PythonRagClientService,
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

    // Step 1: Parse PDF
    const parseStep = await this.createStep(jobId, "parse");
    let parseResult;
    try {
      parseResult = await this.pythonClient.parsePdf(
        document.filePath,
        documentId,
      );
      await this.completeStep(parseStep, {
        page_count: parseResult.page_count,
        section_count: parseResult.sections.length,
        table_count: parseResult.tables.length,
      });
    } catch (err: any) {
      await this.failJob(ingestionJob, parseStep, err.message, document);
      return;
    }

    // Step 2: Build chunks
    const chunkStep = await this.createStep(jobId, "chunk");
    let chunkResult;
    try {
      chunkResult = await this.pythonClient.buildChunks(
        documentId,
        parseResult.sections,
        parseResult.tables,
      );

      // Delete existing chunks for this document (re-ingestion scenario)
      await this.chunkRepo.delete({ documentId });

      const chunkEntities = chunkResult.chunks.map((c) =>
        this.chunkRepo.create({
          documentId,
          sectionCode: c.section_code,
          sectionTitle: c.section_title,
          pageStart: c.page_start,
          pageEnd: c.page_end,
          chunkType: (c.chunk_type as ChunkType) ?? ChunkType.TEXT,
          chunkIndex: c.chunk_index,
          textContent: c.text_content,
          tableJson: c.table_json ?? null,
          metadata: {},
          tokenCount: c.token_count,
        }),
      );

      await this.chunkRepo.save(chunkEntities, { chunk: 100 });
      await this.completeStep(chunkStep, {
        chunk_count: chunkEntities.length,
      });
    } catch (err: any) {
      await this.failJob(ingestionJob, chunkStep, err.message, document);
      return;
    }

    // Step 3: Embed chunks
    const embedStep = await this.createStep(jobId, "embed");
    try {
      const savedChunks = await this.chunkRepo.find({
        where: { documentId },
        order: { chunkIndex: "ASC" },
      });

      const batchSize =
        parseInt(process.env.PYTHON_RAG_EMBED_BATCH_SIZE ?? "32", 10) || 32;

      const embeddingEntities: ChunkEmbedding[] = [];

      embedStep.progressTotal = savedChunks.length;
      embedStep.progressCurrent = 0;
      await this.ingestionStepRepo.save(embedStep);

      for (let i = 0; i < savedChunks.length; i += batchSize) {
        const batch = savedChunks.slice(i, i + batchSize);
        const texts = batch.map((c) => c.textContent);
        const vectors = await this.pythonClient.embedBatch(texts);

        for (let j = 0; j < batch.length; j++) {
          embeddingEntities.push(
            this.embeddingRepo.create({
              chunkId: batch[j].id,
              embedding: vectors[j],
              model: "bge-m3",
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
        model: "bge-m3",
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
}
