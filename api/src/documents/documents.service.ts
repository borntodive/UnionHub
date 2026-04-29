import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Document } from "./entities/document.entity";
import {
  CreateDocumentDto,
  UpdateTranslationDto,
  UploadDocumentDto,
} from "./dto/create-document.dto";
import { AiService } from "../ai/ai.service";
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
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private aiService: AiService,
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
        ruolo: true,
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

  async upload(
    dto: UploadDocumentDto,
    file: Express.Multer.File,
    user: UserInfo,
  ): Promise<any> {
    const base64Pdf = file.buffer.toString("base64");

    const document = this.documentRepository.create({
      title: dto.title,
      originalContent: "[Uploaded PDF - no text content]",
      status: "draft",
      finalPdfUrl: `data:application/pdf;base64,${base64Pdf}`,
      union: dto.union || "fit-cisl",
      ruolo: dto.ruolo || "pilot",
      createdBy: user.userId,
    });

    const savedDocument = await this.documentRepository.save(document);

    return {
      ...savedDocument,
      author: sanitizeAuthor((savedDocument as any).author),
    };
  }

  async update(
    id: string,
    dto: { title?: string; content?: string },
  ): Promise<Document> {
    const document = await this.findByIdRaw(id);

    if (dto.title !== undefined) {
      document.title = dto.title;
    }
    if (dto.content !== undefined) {
      document.originalContent = dto.content;
    }

    return this.documentRepository.save(document);
  }

  /**
   * Process document: AI rewrite + translate + generate PDF
   * All in one operation
   */
  async process(id: string, user: UserInfo): Promise<Document> {
    this.logger.log(`[PROCESS] Starting process for document: ${id}`);
    const document = await this.findByIdRaw(id);

    const isAiReady = await this.aiService.healthCheck();
    if (!isAiReady) {
      throw new BadRequestException(
        "AI service is not available. Please check OpenRouter configuration.",
      );
    }

    const finalContent = document.originalContent;

    try {
      // Step 1: AI rewrite as union communication
      this.logger.log("[PROCESS] Step 1: AI rewrite");
      document.aiReviewedContent =
        await this.aiService.rewriteAsUnionCommunication(finalContent);

      // Step 2: AI translate to English
      this.logger.log("[PROCESS] Step 2: AI translate");
      const contentToTranslate =
        document.aiReviewedContent || document.originalContent;
      document.englishTranslation =
        await this.aiService.translateToEnglish(contentToTranslate);

      // Step 3: Translate title
      this.logger.log("[PROCESS] Step 3: Translate title");
      await this.translateTitleIfNeeded(document);

      // Step 4: Generate PDF
      this.logger.log("[PROCESS] Step 4: Generate PDF");
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);
      const base64Pdf = pdfBuffer.toString("base64");
      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;

      this.logger.log(`[PROCESS] Completed for document: ${id}`);
      return this.documentRepository.save(document);
    } catch (error: any) {
      this.logger.error(`[PROCESS] Error: ${error.message}`);
      throw new BadRequestException(`Process failed: ${error.message}`);
    }
  }

  /**
   * Publish document (draft → published)
   * Sends push notification
   */
  async publish(id: string, user: UserInfo): Promise<Document> {
    this.logger.log(`[PUBLISH] Publishing document: ${id}`);
    const document = await this.findByIdRaw(id);

    if (document.status === "published") {
      return document; // Already published
    }

    // Ensure PDF exists, regenerate if needed
    if (!document.finalPdfUrl) {
      this.logger.log("[PUBLISH] No PDF found, generating...");
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);
      const base64Pdf = pdfBuffer.toString("base64");
      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;
    }

    document.status = "published";
    document.publishedAt = new Date();

    const savedDocument = await this.documentRepository.save(document);

    // Send push notification
    await this.notificationsService.broadcastNotification(
      "\u{1F4E2} Nuovo Comunicato Sindacale",
      `"${document.title}" è stato pubblicato. Tocca per leggere.`,
      {
        documentId: savedDocument.id,
        type: "new_document",
      },
    );

    this.logger.log(`[PUBLISH] Document published: ${id}`);
    return savedDocument;
  }

  /**
   * Update translation manually
   */
  async updateTranslation(
    id: string,
    dto: UpdateTranslationDto,
  ): Promise<Document> {
    const document = await this.findByIdRaw(id);
    document.englishTranslation = dto.englishTranslation;
    if (dto.englishTitle) {
      document.englishTitle = dto.englishTitle;
    }
    return this.documentRepository.save(document);
  }

  /**
   * Regenerate PDF only
   */
  async regeneratePdf(id: string): Promise<Document> {
    this.logger.log(`[REGEN PDF] Regenerating PDF for document: ${id}`);
    const document = await this.findByIdRaw(id);

    // Ensure we have content to generate PDF from
    const contentToUse = document.aiReviewedContent || document.originalContent;

    if (!contentToUse) {
      throw new BadRequestException("No content available to generate PDF");
    }

    try {
      const pdfBuffer = await this.pdfService.generateDocumentPdf(document);
      const base64Pdf = pdfBuffer.toString("base64");
      document.finalPdfUrl = `data:application/pdf;base64,${base64Pdf}`;

      this.logger.log(`[REGEN PDF] PDF regenerated for document: ${id}`);
      return this.documentRepository.save(document);
    } catch (error: any) {
      this.logger.error(`[REGEN PDF] Error: ${error.message}`);
      throw new BadRequestException(
        `Failed to regenerate PDF: ${error.message}`,
      );
    }
  }

  /**
   * Regenerate AI content only (rewrite + translate)
   */
  async regenerateAi(id: string): Promise<Document> {
    this.logger.log(`[REGEN AI] Regenerating AI for document: ${id}`);
    const document = await this.findByIdRaw(id);

    const isAiReady = await this.aiService.healthCheck();
    if (!isAiReady) {
      throw new BadRequestException(
        "AI service is not available. Please check OpenRouter configuration.",
      );
    }

    try {
      // Rewrite
      document.aiReviewedContent =
        await this.aiService.rewriteAsUnionCommunication(
          document.originalContent,
        );

      // Translate
      const contentToTranslate =
        document.aiReviewedContent || document.originalContent;
      document.englishTranslation =
        await this.aiService.translateToEnglish(contentToTranslate);

      // Translate title
      document.englishTitle = null; // Reset to force re-translation
      await this.translateTitleIfNeeded(document);

      this.logger.log(`[REGEN AI] AI regenerated for document: ${id}`);
      return this.documentRepository.save(document);
    } catch (error: any) {
      this.logger.error(`[REGEN AI] Error: ${error.message}`);
      throw new BadRequestException(
        `Failed to regenerate AI: ${error.message}`,
      );
    }
  }

  /**
   * Translate only - no rewrite, no PDF generation
   * Translates content to English and translates title
   */
  async translate(id: string): Promise<Document> {
    this.logger.log(`[TRANSLATE] Translating document: ${id}`);
    const document = await this.findByIdRaw(id);

    const isAiReady = await this.aiService.healthCheck();
    if (!isAiReady) {
      throw new BadRequestException(
        "AI service is not available. Please check OpenRouter configuration.",
      );
    }

    try {
      // Get content to translate (prefer AI reviewed, fallback to original)
      const contentToTranslate =
        document.aiReviewedContent || document.originalContent;

      // Translate content
      document.englishTranslation =
        await this.aiService.translateToEnglish(contentToTranslate);

      // Translate title if needed
      await this.translateTitleIfNeeded(document);

      this.logger.log(`[TRANSLATE] Document translated: ${id}`);
      return this.documentRepository.save(document);
    } catch (error: any) {
      this.logger.error(`[TRANSLATE] Error: ${error.message}`);
      throw new BadRequestException(`Failed to translate: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const document = await this.findByIdRaw(id);

    await this.documentRepository.remove(document);
    this.logger.log(`[DELETE] Document deleted: ${id}`);
  }

  async checkAiHealth(): Promise<{
    available: boolean;
    model: string;
    isCloud: boolean;
  }> {
    const isHealthy = await this.aiService.healthCheck();
    const config = this.aiService.getConfig();
    return {
      available: isHealthy,
      model: config.model,
      isCloud: config.isCloud,
    };
  }

  /**
   * Translate title if not already translated
   */
  private async translateTitleIfNeeded(document: Document): Promise<void> {
    if (!document.englishTitle && document.title) {
      try {
        const systemPrompt = `You are a professional translator. Translate the title from Italian to English maintaining a formal and professional tone. Use the context of the communication for a more accurate translation. Respond ONLY with the translation, no notes or explanations.`;
        const content = document.aiReviewedContent || document.originalContent;
        const prompt = `Translate this title to English using the context of the communication:

TITLE: "${document.title}"

CONTEXT (first 500 characters of the communication):
"${content.substring(0, 500)}..."

Translated title (only the translated title, nothing else):`;

        document.englishTitle = await this.aiService.generate(
          prompt,
          systemPrompt,
        );
        this.logger.log(
          `[TITLE] Title translated: "${document.title}" → "${document.englishTitle}"`,
        );
      } catch (error) {
        this.logger.warn(`[TITLE] Translation failed: ${error.message}`);
        // Don't fail if title translation doesn't work
      }
    }
  }
}
