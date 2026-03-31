import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { RagDocument } from "../entities/rag-document.entity";
import { Chunk } from "../entities/chunk.entity";
import { IngestionJob } from "../entities/ingestion-job.entity";
import { UploadDocumentDto } from "../dto/upload-document.dto";
import { RAG_INGESTION_QUEUE } from "../constants";

@Injectable()
export class RagDocumentService {
  private readonly logger = new Logger(RagDocumentService.name);
  private readonly ragDocsDir: string;

  constructor(
    @InjectRepository(RagDocument)
    private readonly ragDocumentRepo: Repository<RagDocument>,
    @InjectRepository(Chunk)
    private readonly chunkRepo: Repository<Chunk>,
    @InjectQueue(RAG_INGESTION_QUEUE)
    private readonly ingestionQueue: Queue,
  ) {
    // Store RAG PDFs in uploads/rag-docs/ — a subdirectory of the existing uploads dir.
    const uploadsBase =
      process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");
    this.ragDocsDir = path.join(uploadsBase, "rag-docs");
    fs.mkdirSync(this.ragDocsDir, { recursive: true });
  }

  async upload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<RagDocument> {
    // Compute SHA256 for deduplication
    const sha256 = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    const existing = await this.ragDocumentRepo.findOne({ where: { sha256 } });
    if (existing) {
      throw new ConflictException(
        `A document with the same content already exists (id: ${existing.id}, code: ${existing.code})`,
      );
    }

    // Check code uniqueness
    const byCode = await this.ragDocumentRepo.findOne({
      where: { code: dto.code },
    });
    if (byCode) {
      throw new ConflictException(
        `A document with code "${dto.code}" already exists`,
      );
    }

    // Save file
    const filename = `${uuidv4()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(this.ragDocsDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    this.logger.log(`Saved RAG document to ${filePath}`);

    const doc = this.ragDocumentRepo.create({
      code: dto.code,
      title: dto.title,
      manualPart: dto.manualPart ?? null,
      issue: dto.issue ?? null,
      revision: dto.revision ?? null,
      revisionDate: dto.revisionDate ? new Date(dto.revisionDate) : null,
      sourceFileName: file.originalname,
      filePath,
      sha256,
    });

    return this.ragDocumentRepo.save(doc);
  }

  async findAll(): Promise<RagDocument[]> {
    return this.ragDocumentRepo.find({
      where: { isActive: true },
      order: { createdAt: "DESC" },
      relations: ["ingestionJobs", "ingestionJobs.steps"],
    });
  }

  async findById(id: string): Promise<RagDocument> {
    const doc = await this.ragDocumentRepo.findOne({
      where: { id },
      relations: ["ingestionJobs", "ingestionJobs.steps"],
    });
    if (!doc) {
      throw new NotFoundException(`RAG document ${id} not found`);
    }
    return doc;
  }

  async findChunks(documentId: string): Promise<Chunk[]> {
    await this.findById(documentId);
    return this.chunkRepo.find({
      where: { documentId },
      order: { chunkIndex: "ASC" },
    });
  }

  async deactivate(id: string): Promise<void> {
    const doc = await this.findById(id);
    doc.isActive = false;
    await this.ragDocumentRepo.save(doc);
  }

  async delete(id: string): Promise<void> {
    const doc = await this.ragDocumentRepo.findOne({
      where: { id },
      relations: ["ingestionJobs"],
    });
    if (!doc) {
      throw new NotFoundException(`RAG document ${id} not found`);
    }

    // Cancel any active ingestion jobs
    const activeStatuses = ["pending", "running", "retrying"];
    for (const job of doc.ingestionJobs || []) {
      if (activeStatuses.includes(job.status.toLowerCase())) {
        // Find BullMQ jobs and cancel them
        const bullJobs = await this.ingestionQueue.getJobs(
          ["wait", "active", "delayed"],
          0,
          -1,
        );
        for (const bullJob of bullJobs) {
          if (bullJob.data.jobId === job.id) {
            try {
              await bullJob.remove();
              this.logger.log(`Cancelled BullMQ job ${bullJob.id}`);
            } catch (err) {
              this.logger.warn(
                `Failed to cancel BullMQ job ${bullJob.id}: ${err}`,
              );
            }
          }
        }
      }
    }

    // Delete physical file
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
        this.logger.log(`Deleted physical file: ${doc.filePath}`);
      } catch (err) {
        this.logger.warn(`Failed to delete physical file: ${err}`);
      }
    }

    // Delete document from database (cascade will handle related entities)
    await this.ragDocumentRepo.remove(doc);
    this.logger.log(`Deleted RAG document ${id}`);
  }
}
