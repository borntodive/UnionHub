import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IngestionJob } from "../entities/ingestion-job.entity";
import { IngestionStatus } from "../enums/ingestion-status.enum";
import { IngestionStartDto } from "../dto/ingestion-start.dto";
import { RagDocumentService } from "./rag-document.service";
import { RAG_INGESTION_QUEUE } from "../constants";

@Injectable()
export class IngestionService {
  constructor(
    @InjectQueue(RAG_INGESTION_QUEUE)
    private readonly ingestionQueue: Queue,
    @InjectRepository(IngestionJob)
    private readonly ingestionJobRepo: Repository<IngestionJob>,
    private readonly ragDocumentService: RagDocumentService,
  ) {}

  async startJob(dto: IngestionStartDto): Promise<IngestionJob> {
    const doc = await this.ragDocumentService.findById(dto.documentId);

    const job = this.ingestionJobRepo.create({
      documentId: doc.id,
      status: IngestionStatus.PENDING,
    });
    const savedJob = await this.ingestionJobRepo.save(job);

    // Enqueue background processing
    await this.ingestionQueue.add(
      "ingest",
      { jobId: savedJob.id, documentId: doc.id },
      { attempts: 1, removeOnComplete: true, removeOnFail: false },
    );

    return savedJob;
  }

  async getJobStatus(jobId: string): Promise<IngestionJob> {
    const job = await this.ingestionJobRepo.findOne({
      where: { id: jobId },
      relations: ["steps"],
    });
    if (!job) {
      throw new NotFoundException(`Ingestion job ${jobId} not found`);
    }
    return job;
  }

  async retryJob(jobId: string): Promise<IngestionJob> {
    const existing = await this.getJobStatus(jobId);
    if (existing.status !== IngestionStatus.FAILED) {
      throw new BadRequestException(
        `Job ${jobId} cannot be retried — current status: ${existing.status}`,
      );
    }

    const newJob = this.ingestionJobRepo.create({
      documentId: existing.documentId,
      status: IngestionStatus.PENDING,
    });
    const savedJob = await this.ingestionJobRepo.save(newJob);

    await this.ingestionQueue.add(
      "ingest",
      { jobId: savedJob.id, documentId: existing.documentId },
      { attempts: 1, removeOnComplete: true, removeOnFail: false },
    );

    return savedJob;
  }
}
