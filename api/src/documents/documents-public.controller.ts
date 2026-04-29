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

/**
 * Sanitize document title for use as filename
 * Removes invalid characters and limits length
 */
function sanitizeFilename(title: string): string {
  if (!title) return "document";

  // Remove invalid characters for filenames: / \ : * ? " < > |
  let sanitized = title.replace(/[\/\\:*?"<>|]/g, "");

  // Replace newlines and multiple spaces with single underscore
  sanitized = sanitized.replace(/[\r\n]+/g, "_").replace(/\s+/g, "_");

  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, "_");

  // Remove leading/trailing underscores and dots
  sanitized = sanitized.replace(/^[_\.]+|[_\.]+$/g, "");

  // Limit length (255 chars max for most filesystems, leave room for .pdf)
  const maxLength = 200;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized || "document";
}

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

    // Only published documents can be downloaded publicly
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

      const filename = sanitizeFilename(document.title);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${filename}.pdf"`,
      );
      res.send(buffer);
    } else {
      throw new NotFoundException("Invalid PDF URL");
    }
  }
}
