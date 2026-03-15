import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { CreateDocumentDto, ReviewDocumentDto, ApproveDocumentDto } from './dto/create-document.dto';
import { OllamaService } from '../ollama/ollama.service';

interface UserInfo {
  userId: string;
  crewcode: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private ollamaService: OllamaService,
  ) {}

  // Get all documents
  async findAll(): Promise<Document[]> {
    return this.documentRepository.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get document by ID
  async findById(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  // Create new document (draft)
  async create(dto: CreateDocumentDto, user: UserInfo): Promise<Document> {
    const document = this.documentRepository.create({
      title: dto.title,
      originalContent: dto.content,
      status: 'draft',
      createdBy: user.userId,
    });

    return this.documentRepository.save(document);
  }

  // AI Review - rewrite as union communication using Ollama
  async review(id: string, dto: ReviewDocumentDto): Promise<Document> {
    const document = await this.findById(id);

    // Check if Ollama is available
    const isOllamaReady = await this.ollamaService.healthCheck();
    if (!isOllamaReady) {
      throw new BadRequestException('Ollama service is not available. Please ensure Ollama is running.');
    }

    // Use Ollama to rewrite as union communication
    const aiReviewed = await this.ollamaService.rewriteAsUnionCommunication(dto.content);

    document.aiReviewedContent = aiReviewed;
    document.status = 'reviewing';

    return this.documentRepository.save(document);
  }

  // Approve and generate translations using Ollama
  async approve(id: string, dto: ApproveDocumentDto, user: UserInfo): Promise<Document> {
    const document = await this.findById(id);

    const finalContent = dto.reviewedContent || document.aiReviewedContent;
    if (!finalContent) {
      throw new Error('No content to approve');
    }

    // Check if Ollama is available
    const isOllamaReady = await this.ollamaService.healthCheck();
    if (!isOllamaReady) {
      throw new BadRequestException('Ollama service is not available. Please ensure Ollama is running.');
    }

    // Use Ollama to translate to English
    const englishTranslation = await this.ollamaService.translateToEnglish(finalContent);

    document.aiReviewedContent = finalContent;
    document.englishTranslation = englishTranslation;
    document.status = 'approved';

    return this.documentRepository.save(document);
  }

  // Generate final PDF with letterhead
  async publish(id: string, user: UserInfo): Promise<Document> {
    const document = await this.findById(id);

    if (document.status !== 'approved') {
      throw new Error('Document must be approved before publishing');
    }

    // TODO: Generate PDF with letterhead
    // For now, just mark as published
    document.status = 'published';
    document.publishedAt = new Date();
    document.finalPdfUrl = `/documents/${id}/download`; // Placeholder

    return this.documentRepository.save(document);
  }

  // Delete document
  async delete(id: string): Promise<void> {
    const document = await this.findById(id);
    await this.documentRepository.remove(document);
  }

  // Check Ollama health
  async checkOllamaHealth(): Promise<{ available: boolean; model: string }> {
    const isHealthy = await this.ollamaService.healthCheck();
    return {
      available: isHealthy,
      model: 'llama3.2',
    };
  }
}
