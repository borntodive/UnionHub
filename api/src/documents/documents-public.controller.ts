import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Response,
  NotFoundException,
} from "@nestjs/common";
import { DocumentsService } from "./documents.service";

/**
 * Public Documents Controller
 * Accessibile senza autenticazione
 */
@Controller("documents/public")
export class DocumentsPublicController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("published")
  async findPublished() {
    return this.documentsService.findPublished();
  }

  @Get(":id/download")
  async downloadPdf(
    @Param("id", ParseUUIDPipe) id: string,
    @Response() res: any,
  ) {
    const document = await this.documentsService.findById(id);

    // Solo i documenti pubblicati possono essere scaricati pubblicamente
    if (document.status !== "published") {
      throw new NotFoundException("Document not found");
    }

    if (!document.finalPdfUrl) {
      throw new NotFoundException("PDF not found");
    }

    // If it's a data URL, extract base64 and send
    if (document.finalPdfUrl.startsWith("data:application/pdf;base64,")) {
      const base64 = document.finalPdfUrl.replace(
        "data:application/pdf;base64,",
        "",
      );
      const buffer = Buffer.from(base64, "base64");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${document.title}.pdf"`,
      );
      res.send(buffer);
    } else {
      // It's a URL, redirect to it
      res.redirect(document.finalPdfUrl);
    }
  }
}
