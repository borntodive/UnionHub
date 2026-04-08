import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Document } from "./entities/document.entity";
import {
  CreateDocumentDto,
  ReviewDocumentDto,
  ApproveDocumentDto,
  UpdateTranslationDto,
  UploadDocumentDto,
} from "./dto/create-document.dto";
import { OllamaService } from "../ollama/ollama.service";
import { PdfService } from "./pdf.service";
import { NotificationsService } from "../notifications/notifications.service";

interface UserInfo {
  userId: string;
  crewcode: string;
}

function sanitizeAuthor(author: any) {
  if (!author) return null;
  return {
    id: author.id,
    nome: author.nome,
    cognome: author.cognome,
    crewcode: author.crewcode,
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private ollamaService: OllamaService,
    private pdfService: PdfService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(): Promise<any[]> {
    const docs = await this.documentRepository.find({
      relations: ["author"],
      order: { createdAt: "DESC" },
    });
    return docs.map((d: any) => ({ ...d, author: sanitizeAuthor(d.author) }));
  }

  async findVerified(): Promise<any[]> {
    const docs = await this.documentRepository.find({
      where: { status: "verified" },
      relations: ["author"],
      order: { updatedAt: "DESC" },
    });
    return docs.map((d: any) => ({ ...d, author: sanitizeAuthor(d.author) }));
  }

  async findPublished(): Promise<Document[]> {
    return this.documentRepository.find({
      where: { status: "published" },
      relations: ["author"],
      order: { publishedAt: "DESC" },
      select: {
        id: true,
        title: true,
        englishTitle: true,
        status: true,
        union: true,
        publishedAt: true,
        createdAt: true,
        author: {
          id: true,
          nome: true,
          cognome: true,
          crewcode: true,
        },
      },
    });
  }

  private async findByIdRaw(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ["author"],
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    return document;
  }

  async findById(id: string): Promise<any> {
    const document = await this.findByIdRaw(id);
    return { ...document, author: sanitizeAuthor((document as any).author) };
  }

  async create(dto: CreateDocumentDto, user: UserInfo): Promise<Document> {
    const document = this.documentRepository.create({
      title: dto.title,
      originalContent: dto.content,
      status: "draft",
      createdBy: user.userId,
      union: dto.union || "fit-cisl",
      ruolo: dto.ruolo || "pilot",
    });

    return this.documentRepository.save(document);
  }

  async uploadAndPublish(
    dto: UploadDocumentDto,
    file: Express.Multer.File,
    user: UserInfo,
  ): Promise<any> {
    const base64Pdf = file.buffer.toString("base64");

    const document = this.documentRepository.create({
      title: dto.title,
      originalContent: "[Uploaded PDF]",
      status: "published" as const,
      publishedAt: new Date(),
      finalPdfUrl: `data:application/pdf;base64,${base64Pdf}`,
      union: dto.union || "fit-cisl",
      ruolo: dto.ruolo || "pilot",
      createdBy: user.userId,
    });

    const savedDocument = await this.documentRepository.save(document);

    await this.notificationsService.broadcastNotification(
      "\u{1F4E2} Nuovo Comunicato Sindakale",
      `"${document.title}" è stato pubblicato. Tocca per leggere.`,
      {
        documentId: savedDocument.id,
        type: "new_document",
      },
    );

    return {
      ...savedDocument,
      author: sanitizeAuthor((savedDocument as any).author),
    };
  }

  async review(id: string, dto: ReviewDocumentDto): Promise<Document> {
    const document = await this.findByIdRaw(id);

    const isOllamaReady = await this.ollamaService.healthCheck();
    if (!isOllamaReady) {
      throw new BadRequestException(
        "Ollama service is not available. Please ensure Ollama is running.",
      );
    }

    const aiReviewed = await this.ollamaService.rewriteAsUnionCommunication(
      dto.content,
    );

    document.aiReviewedContent = aiReviewed;
    document.status = "reviewing";

    return this.documentRepository.save(document);
  }

  async approve(
    id: string,
    dto: ApproveDocumentDto,
    user: UserInfo,
  ): Promise<Document> {
    try {
      const document = await this.findByIdRaw(id);

      const finalContent =
        dto.reviewedContent ||
        document.aiReviewedContent ||
        document.originalContent;
      if (!finalContent) {
        throw new Error("No content to approve");
      }

      let englishTranslation: string | null = null;
      try {
        const isOllamaReady = await this.ollamaService.healthCheck();
        if (isOllamaReady) {
          englishTranslation =
            await this.ollamaService.translateToEnglish(finalContent);
        }
      } catch (error: any) {
        console.warn("Ollama translation skipped: " + error.message);
      }

      document.aiReviewedContent = finalContent;
      document.englishTranslation = englishTranslation;
      document.status = "approved";

      return await this.documentRepository.save(document);
    } catch (error) {
      throw error;
    }
  }

  private async translateTitleIfNeeded(document: Document): Promise<void> {
    if (!document.englishTitle && document.title) {
      try {
        const isOllamaReady = await this.ollamaService.healthCheck();
        if (isOllamaReady) {
          const systemPrompt = `Sei un traduttore professionale. Traduci il titolo dal italiano all'inglese mantenendo il tono formale e professionale. Usa il contesto del comunicato per una traduzione più accurata. Rispondi SOLO con la traduzione, senza note o spiegazioni.`;
          const content =
            document.aiReviewedContent || document.originalContent;
          const prompt = `Traduci questo titolo in inglese usando il contesto del comunicato:

TITOLO: "${document.title}"

CONTESTO (primi 500 caratteri del comunicato):
"${content.substring(0, 500)}..."

Traduzione del titolo (solo il titolo tradotto, nient'altro):`;
          document.englishTitle = await this.ollamaService.generate(
            prompt,
            systemPrompt,
          );
        }
      } catch {
        // Don't fail if translation doesn't work
      }
    }
  }

  async verify(id: string, user: UserInfo): Promise<Document> {
    const document = await this.findByIdRaw(id);

    if (document.status !== "approved") {
      throw new Error("Document must be approved before verification");
    }

    await this.translateTitleIfNeeded(document);

    try {
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);
      const base64Pdf = pdfBuffer.toString("base64");

      document.status = "verified";
      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;

      return this.documentRepository.save(document);
    } catch (error) {
      throw new Error("Failed to generate PDF: " + error.message);
    }
  }

  async publish(id: string, user: UserInfo): Promise<Document> {
    const document = await this.findByIdRaw(id);

    if (document.status !== "verified") {
      throw new Error("Document must be verified before publishing");
    }

    await this.translateTitleIfNeeded(document);

    try {
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);

      const base64Pdf = pdfBuffer.toString("base64");

      document.status = "published";
      document.publishedAt = new Date();
      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;

      const savedDocument = await this.documentRepository.save(document);

      await this.notificationsService.broadcastNotification(
        "📢 Nuovo Comunicato Sindakale",
        `"${document.title}" è stato pubblicato. Tocca per leggere.`,
        {
          documentId: document.id,
          type: "new_document",
        },
      );

      return savedDocument;
    } catch (error) {
      throw new Error("Failed to generate PDF: " + error.message);
    }
  }

  async regeneratePdf(id: string, user: UserInfo): Promise<Document> {
    const document = await this.findByIdRaw(id);

    if (document.status !== "published" && document.status !== "verified") {
      throw new Error(
        "Document must be published or verified to regenerate PDF",
      );
    }

    await this.translateTitleIfNeeded(document);

    try {
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);
      const base64Pdf = pdfBuffer.toString("base64");

      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;

      return this.documentRepository.save(document);
    } catch (error) {
      throw new Error("Failed to regenerate PDF: " + error.message);
    }
  }

  async regenerateTranslations(id: string, user: UserInfo): Promise<Document> {
    const document = await this.findByIdRaw(id);

    document.englishTitle = null;
    document.englishTranslation = null;

    try {
      const isOllamaReady = await this.ollamaService.healthCheck();
      if (!isOllamaReady) {
        throw new Error("Ollama service is not available");
      }

      const finalContent =
        document.aiReviewedContent || document.originalContent;
      document.englishTranslation =
        await this.ollamaService.translateToEnglish(finalContent);

      await this.translateTitleIfNeeded(document);

      return this.documentRepository.save(document);
    } catch (error) {
      throw new Error("Failed to regenerate translations: " + error.message);
    }
  }

  async updateTranslation(
    id: string,
    dto: UpdateTranslationDto,
  ): Promise<Document> {
    const document = await this.findByIdRaw(id);
    document.englishTranslation = dto.englishTranslation;
    return this.documentRepository.save(document);
  }

  async reject(id: string, rejectionReason?: string): Promise<Document> {
    const document = await this.findByIdRaw(id);
    document.status = "rejected";
    document.rejectionReason = rejectionReason || null;
    return this.documentRepository.save(document);
  }

  async delete(id: string): Promise<void> {
    const document = await this.findByIdRaw(id);
    await this.documentRepository.remove(document);
  }

  async checkOllamaHealth(): Promise<{
    available: boolean;
    model: string;
    isCloud: boolean;
  }> {
    const isHealthy = await this.ollamaService.healthCheck();
    const config = this.ollamaService.getConfig();
    return {
      available: isHealthy,
      model: config.model,
      isCloud: config.isCloud,
    };
  }
}
