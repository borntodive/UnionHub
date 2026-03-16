import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { CreateDocumentDto, ReviewDocumentDto, ApproveDocumentDto } from './dto/create-document.dto';
import { OllamaService } from '../ollama/ollama.service';
import { PdfService } from './pdf.service';

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
    private pdfService: PdfService,
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

  // Approve and generate translations (AI optional)
  async approve(id: string, dto: ApproveDocumentDto, user: UserInfo): Promise<Document> {
    try {
      const document = await this.findById(id);

      const finalContent = dto.reviewedContent || document.aiReviewedContent || document.originalContent;
      if (!finalContent) {
        throw new Error('No content to approve');
      }

      // Try to use Ollama for translation, but don't fail if it's not available
      let englishTranslation: string | null = null;
      try {
        const isOllamaReady = await this.ollamaService.healthCheck();
        if (isOllamaReady) {
          englishTranslation = await this.ollamaService.translateToEnglish(finalContent);
        }
      } catch (error) {
        // Log but don't fail - translation is optional
        console.log('Ollama translation skipped:', error.message);
      }

      document.aiReviewedContent = finalContent;
      document.englishTranslation = englishTranslation;
      document.status = 'approved';

      return await this.documentRepository.save(document);
    } catch (error) {
      console.error('Approve failed:', error);
      throw error;
    }
  }

  // Translate title if not already translated
  private async translateTitleIfNeeded(document: Document): Promise<void> {
    if (!document.englishTitle && document.title) {
      try {
        const isOllamaReady = await this.ollamaService.healthCheck();
        if (isOllamaReady) {
          const systemPrompt = `Sei un traduttore professionale. Traduci il titolo dal italiano all'inglese mantenendo il tono formale e professionale. Usa il contesto del comunicato per una traduzione più accurata. Rispondi SOLO con la traduzione, senza note o spiegazioni.`;
          const content = document.aiReviewedContent || document.originalContent;
          const prompt = `Traduci questo titolo in inglese usando il contesto del comunicato:

TITOLO: "${document.title}"

CONTESTO (primi 500 caratteri del comunicato):
"${content.substring(0, 500)}..."

Traduzione del titolo (solo il titolo tradotto, nient'altro):`;
          document.englishTitle = await this.ollamaService.generate(prompt, systemPrompt);
        }
      } catch (error) {
        console.log('Title translation failed:', error.message);
        // Don't fail if translation doesn't work
      }
    }
  }

  // Generate final PDF with letterhead and publish
  async publish(id: string, user: UserInfo): Promise<Document> {
    const document = await this.findById(id);

    if (document.status !== 'approved') {
      throw new Error('Document must be approved before publishing');
    }

    // Translate title if needed
    await this.translateTitleIfNeeded(document);

    // Generate PDF
    try {
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);
      
      // Store PDF (in a real app, you'd upload to S3 or similar)
      // For now, we'll store base64 in the URL field (not ideal but works for demo)
      const base64Pdf = pdfBuffer.toString('base64');
      
      document.status = 'published';
      document.publishedAt = new Date();
      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;

      return this.documentRepository.save(document);
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  // Regenerate PDF for published document (dev only)
  async regeneratePdf(id: string, user: UserInfo): Promise<Document> {
    const document = await this.findById(id);

    if (document.status !== 'published') {
      throw new Error('Document must be published to regenerate PDF');
    }

    // Translate title if needed (in case it was empty before)
    await this.translateTitleIfNeeded(document);

    try {
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);
      const base64Pdf = pdfBuffer.toString('base64');
      
      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;

      return this.documentRepository.save(document);
    } catch (error) {
      console.error('PDF regeneration failed:', error);
      throw new Error('Failed to regenerate PDF: ' + error.message);
    }
  }

  // Delete document
  async delete(id: string): Promise<void> {
    const document = await this.findById(id);
    await this.documentRepository.remove(document);
  }

  // Check Ollama health
  async checkOllamaHealth(): Promise<{ available: boolean; model: string; isCloud: boolean }> {
    const isHealthy = await this.ollamaService.healthCheck();
    const config = this.ollamaService.getConfig();
    return {
      available: isHealthy,
      model: config.model,
      isCloud: config.isCloud,
    };
  }
}
