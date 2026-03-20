import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    // Upload directory: project-root/uploads/registration-forms/
    this.uploadDir = path.join(process.cwd(), "uploads", "registration-forms");
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Save a PDF file to storage
   * @param buffer - File buffer
   * @param originalName - Original file name
   * @param crewcode - User's crewcode for organization
   * @returns Object with file path and URL
   */
  async savePdf(
    buffer: Buffer,
    originalName: string,
    crewcode: string,
  ): Promise<{ filePath: string; fileUrl: string }> {
    try {
      // Create user-specific subdirectory
      const userDir = path.join(this.uploadDir, crewcode);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedOriginal = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `${timestamp}_${uuidv4().slice(0, 8)}_${sanitizedOriginal}`;
      const filePath = path.join(userDir, filename);

      // Write file
      await fs.promises.writeFile(filePath, buffer);

      // Generate URL path (relative to uploads directory)
      const fileUrl = `/uploads/registration-forms/${crewcode}/${filename}`;

      this.logger.log(`Saved PDF for ${crewcode}: ${fileUrl}`);

      return { filePath, fileUrl };
    } catch (error) {
      this.logger.error(`Failed to save PDF: ${error.message}`, error.stack);
      throw new Error("Failed to save PDF file");
    }
  }

  /**
   * Get file path from URL
   */
  getFilePathFromUrl(fileUrl: string): string {
    // Remove leading slash and convert to absolute path
    const relativePath = fileUrl.replace(/^\/uploads\//, "");
    return path.join(process.cwd(), "uploads", relativePath);
  }

  /**
   * Delete a file
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const filePath = this.getFilePathFromUrl(fileUrl);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted file: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  fileExists(fileUrl: string): boolean {
    try {
      const filePath = this.getFilePathFromUrl(fileUrl);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }
}
