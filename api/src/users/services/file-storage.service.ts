import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

// UUID v4 pattern — used to validate tempId and prevent path traversal
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;
  private readonly tempDir: string;

  constructor() {
    // UPLOAD_BASE_DIR env var points to a persistent directory outside the
    // deploy folder (e.g. /var/www/unionhub-uploads on Cleavr).
    // Falls back to <cwd>/uploads for local development.
    const baseDir =
      process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");
    this.uploadDir = path.join(baseDir, "registration-forms");
    this.tempDir = path.join(this.uploadDir, "temp");
    this.ensureUploadDirExists();
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  private getTempFilePath(tempId: string): string {
    if (!UUID_RE.test(tempId)) {
      throw new Error("Invalid tempId");
    }
    return path.join(this.tempDir, `${tempId}.pdf`);
  }

  /** Save a PDF buffer to the temp directory. Returns the tempId (UUID). */
  async savePdfTemp(buffer: Buffer): Promise<string> {
    const tempId = uuidv4();
    const filePath = this.getTempFilePath(tempId);
    await fs.promises.writeFile(filePath, buffer);
    this.logger.log(`Saved temp PDF: ${tempId}`);
    return tempId;
  }

  /** Read a temp PDF and return it as a base64 string (no data: prefix). */
  async getTempPdfBase64(tempId: string): Promise<string> {
    const filePath = this.getTempFilePath(tempId);
    if (!fs.existsSync(filePath)) {
      throw new Error("Temp file not found");
    }
    const buf = await fs.promises.readFile(filePath);
    return buf.toString("base64");
  }

  /** Move a temp file to the permanent registration-forms/{crewcode}/ directory. */
  async moveTempToPermanent(tempId: string, crewcode: string): Promise<string> {
    const tempPath = this.getTempFilePath(tempId);
    if (!fs.existsSync(tempPath)) {
      throw new Error(`Temp registration form not found: ${tempId}`);
    }

    const sanitizedCrewcode = crewcode.replace(/[^a-zA-Z0-9_-]/g, "_");
    const userDir = path.join(this.uploadDir, sanitizedCrewcode);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filename = `${Date.now()}_registration.pdf`;
    const destPath = path.join(userDir, filename);

    await fs.promises.rename(tempPath, destPath);
    const fileUrl = `/uploads/registration-forms/${sanitizedCrewcode}/${filename}`;
    this.logger.log(`Moved temp ${tempId} → ${fileUrl}`);
    return fileUrl;
  }

  /** Check whether a temp file with this ID exists. */
  tempFileExists(tempId: string): boolean {
    try {
      return fs.existsSync(this.getTempFilePath(tempId));
    } catch {
      return false;
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
    const baseDir =
      process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");
    const relativePath = fileUrl.replace(/^\/uploads\//, "");
    return path.join(baseDir, relativePath);
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
   * Move a PDF from the bulkimport staging directory to the permanent
   * registration-forms/{crewcode}/ directory.
   * Returns the fileUrl on success, or null if no matching PDF is staged.
   */
  async moveBulkImportPdf(crewcode: string): Promise<string | null> {
    const baseDir =
      process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");
    const bulkimportDir = path.join(baseDir, "bulkimport");
    const srcPath = path.join(bulkimportDir, `${crewcode.toUpperCase()}.pdf`);

    if (!fs.existsSync(srcPath)) {
      return null;
    }

    const sanitizedCrewcode = crewcode.replace(/[^a-zA-Z0-9_-]/g, "_");
    const userDir = path.join(this.uploadDir, sanitizedCrewcode);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filename = `${Date.now()}_registration.pdf`;
    const destPath = path.join(userDir, filename);

    await fs.promises.rename(srcPath, destPath);
    const fileUrl = `/uploads/registration-forms/${sanitizedCrewcode}/${filename}`;
    this.logger.log(`Bulk import: moved ${crewcode}.pdf → ${fileUrl}`);
    return fileUrl;
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
