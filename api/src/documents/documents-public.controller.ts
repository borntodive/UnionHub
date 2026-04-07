import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Response,
  NotFoundException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { DocumentsService } from "./documents.service";

@Controller("documents/public")
export class DocumentsPublicController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Throttle({ default: { ttl: 60000, limit: 30 } })
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

      const sanitizedTitle = (document.title || "document")
        .replace(/[\r\n"]/g, "_");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${sanitizedTitle}.pdf"`,
      );
      res.send(buffer);
    } else {
      throw new NotFoundException("Invalid PDF URL");
    }
  }
}
