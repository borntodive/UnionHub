import { Injectable, Logger } from "@nestjs/common";
import { fromBuffer } from "pdf2pic";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class PdfImageService {
  private readonly logger = new Logger(PdfImageService.name);
  private readonly tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), "uploads", "temp");
    this.ensureTempDirExists();
  }

  private ensureTempDirExists(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Convert first page of PDF to base64 image
   * @param pdfBuffer - PDF file buffer
   * @returns Base64 encoded PNG image
   */
  async convertFirstPageToImage(pdfBuffer: Buffer): Promise<string> {
    try {
      const options = {
        density: 150,
        format: "png",
        width: 800,
        height: 1131, // A4 ratio
        quality: 90,
      };

      const convert = fromBuffer(pdfBuffer, options);
      const result = await convert.bulk(1, { responseType: "base64" }); // Convert page 1 to base64

      if (!result || result.length === 0 || !result[0].base64) {
        throw new Error("Failed to convert PDF to image");
      }

      return result[0].base64;
    } catch (error) {
      this.logger.error(
        `Failed to convert PDF to image: ${error.message}`,
        error.stack,
      );
      throw new Error("Failed to convert PDF to image");
    }
  }

  /**
   * Convert first page of PDF to file and return path
   * @param pdfBuffer - PDF file buffer
   * @param filename - Output filename
   * @returns Path to generated image
   */
  async convertFirstPageToFile(
    pdfBuffer: Buffer,
    filename: string,
  ): Promise<string> {
    try {
      const options = {
        density: 150,
        format: "png",
        width: 800,
        height: 1131,
        quality: 90,
        savePath: this.tempDir,
        saveFilename: filename,
      };

      const convert = fromBuffer(pdfBuffer, options);
      await convert(1);

      const outputPath = path.join(this.tempDir, `${filename}.png`);
      return outputPath;
    } catch (error) {
      this.logger.error(
        `Failed to convert PDF to file: ${error.message}`,
        error.stack,
      );
      throw new Error("Failed to convert PDF to image");
    }
  }
}
