import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";

export interface TableDetection {
  pageIndex: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface ExtractedTable {
  pageIndex: number;
  headers: string[];
  rows: string[][];
  confidence: number;
}

@Injectable()
export class TableExtractorService {
  private readonly logger = new Logger(TableExtractorService.name);
  private readonly apiKey: string;
  private readonly baseURL = "https://openrouter.ai/api/v1";
  private readonly visionModel: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("OPENROUTER_API_KEY") || "";
    this.visionModel =
      this.configService.get<string>("VISION_TABLE_MODEL") ||
      "google/gemma-3-27b-it:free"; // Has vision capabilities
  }

  /**
   * Detect and extract tables from a PDF file.
   * Returns structured table data with headers and rows.
   */
  async extractTablesFromPdf(
    pdfPath: string,
    maxPages: number = 50,
  ): Promise<ExtractedTable[]> {
    try {
      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      this.logger.log(`Extracting tables from ${pdfPath}...`);

      // For now, we'll use a heuristic approach on the raw text
      // This can be enhanced with proper vision-based table detection
      const tables = await this.extractTablesFromText(pdfPath, maxPages);

      this.logger.log(`Extracted ${tables.length} tables from PDF`);
      return tables;
    } catch (error: any) {
      this.logger.error(`Table extraction failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract tables from PDF using text analysis.
   * This is a fallback when vision-based extraction is not available.
   * Uses pattern matching to detect table-like structures.
   */
  private async extractTablesFromText(
    pdfPath: string,
    maxPages: number,
  ): Promise<ExtractedTable[]> {
    const pdf = require("pdf-parse");
    const dataBuffer = fs.readFileSync(pdfPath);

    const data = (await pdf(dataBuffer)) as {
      text: string;
      numpages: number;
    };

    const text = data.text;
    const tables: ExtractedTable[] = [];

    // Split text into pages (heuristic - look for page markers)
    const pages = this.splitIntoPages(text, data.numpages);

    for (let i = 0; i < Math.min(pages.length, maxPages); i++) {
      const pageTables = this.detectTablesInPage(pages[i], i);
      tables.push(...pageTables);
    }

    return tables;
  }

  /**
   * Split PDF text into pages using heuristics.
   * PDF text often contains form feed characters or page number patterns.
   */
  private splitIntoPages(text: string, pageCount: number): string[] {
    // Try to find page breaks first
    const formFeedSplit = text.split(/\f/);
    if (formFeedSplit.length > 1) {
      return formFeedSplit;
    }

    // Look for common page number patterns like "Page 1", "Pagina 23", etc.
    const pagePattern =
      /\n\s*(?:Pag(?:e|ina)?\s*)?\d+\s*(?:di\s*\d+|\s+of\s+\d+)?\s*\n/gi;
    const pageSplit = text.split(pagePattern);

    if (pageSplit.length > 1 && pageSplit.length <= pageCount + 10) {
      return pageSplit;
    }

    // Fallback: split evenly
    const avgPageSize = Math.ceil(text.length / pageCount);
    const pages: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      const start = i * avgPageSize;
      const end = start + avgPageSize;
      pages.push(text.slice(start, end));
    }
    return pages;
  }

  /**
   * Detect tables in a page of text using pattern matching.
   * Looks for repeated column patterns and tabular structures.
   */
  private detectTablesInPage(
    pageText: string,
    pageIndex: number,
  ): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    const lines = pageText.split("\n").filter((l) => l.trim().length > 0);

    let i = 0;
    while (i < lines.length) {
      const tableStart = this.findTableStart(lines, i);
      if (tableStart === -1) {
        break;
      }

      const tableEnd = this.findTableEnd(lines, tableStart);
      const tableLines = lines.slice(tableStart, tableEnd + 1);

      if (tableLines.length >= 2) {
        const table = this.parseTable(tableLines, pageIndex);
        if (table) {
          tables.push(table);
        }
      }

      i = tableEnd + 1;
    }

    return tables;
  }

  /**
   * Find the start of a table by looking for repeating patterns.
   */
  private findTableStart(lines: string[], startIndex: number): number {
    for (let i = startIndex; i < lines.length - 2; i++) {
      const line = lines[i];

      // Skip lines that are too long (likely paragraphs, not tables)
      if (line.length > 200) {
        continue;
      }

      // Check for tab-separated or multiple-space separated values
      const hasMultipleColumns =
        line.includes("\t") ||
        /\s{3,}/.test(line) || // 3+ spaces suggest columns
        /\s{2,}[\d\.]+\s{2,}/.test(line); // Numbers with spacing

      if (hasMultipleColumns) {
        // Check if next line has similar pattern
        const nextLine = lines[i + 1];
        if (
          nextLine &&
          this.hasSimilarColumnCount(line, nextLine) &&
          this.looksLikeHeaderRow(line)
        ) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Find the end of a table by looking for where the tabular pattern breaks.
   */
  private findTableEnd(lines: string[], startIndex: number): number {
    let consecutiveNonTable = 0;
    const maxConsecutive = 2;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];

      if (this.looksLikeTableRow(line)) {
        consecutiveNonTable = 0;
      } else {
        consecutiveNonTable++;
        if (consecutiveNonTable >= maxConsecutive) {
          return i - maxConsecutive;
        }
      }

      // Stop if we hit a clear section break
      if (line.trim() === "" && i > startIndex + 2) {
        return i - 1;
      }
    }

    return lines.length - 1;
  }

  /**
   * Check if a line looks like a table header.
   */
  private looksLikeHeaderRow(line: string): boolean {
    const trimmed = line.trim();
    // Headers often are all caps or title case
    const hasWords = trimmed.split(/\s{2,}|\t/).length >= 2;
    const notTooLong = trimmed.length < 150;
    return hasWords && notTooLong;
  }

  /**
   * Check if a line looks like a table row.
   */
  private looksLikeTableRow(line: string): boolean {
    if (!line || line.trim().length === 0) {
      return false;
    }

    // Check for tab-separated values
    if (line.includes("\t")) {
      return true;
    }

    // Check for multiple spaces (suggests columns)
    const hasMultipleSpaces = /\s{3,}/.test(line);
    if (!hasMultipleSpaces) {
      return false;
    }

    // Check if it has numeric values (common in tables)
    const hasNumbers = /\d+/.test(line);
    if (hasNumbers) {
      return true;
    }

    // Check for consistent column-like structure
    const parts = line.split(/\s{3,}/);
    return parts.length >= 2 && parts.every((p) => p.length > 0);
  }

  /**
   * Check if two lines have similar column counts.
   */
  private hasSimilarColumnCount(line1: string, line2: string): boolean {
    const count1 = this.countColumns(line1);
    const count2 = this.countColumns(line2);

    // Allow slight variation (e.g., merged cells)
    const diff = Math.abs(count1 - count2);
    return diff <= 1 || count1 === count2;
  }

  /**
   * Count the number of columns in a line.
   */
  private countColumns(line: string): number {
    if (line.includes("\t")) {
      return line.split("\t").length;
    }
    return line.split(/\s{3,}/).length;
  }

  /**
   * Parse table lines into structured data.
   */
  private parseTable(
    tableLines: string[],
    pageIndex: number,
  ): ExtractedTable | null {
    if (tableLines.length < 2) {
      return null;
    }

    // Detect separator (tab or spaces)
    const useTabs = tableLines[0].includes("\t");
    const separator = useTabs ? "\t" : /\s{3,}/;

    // Parse headers
    const headers = tableLines[0]
      .split(separator)
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    if (headers.length < 2) {
      return null; // Not a valid table
    }

    // Parse rows
    const rows: string[][] = [];
    for (let i = 1; i < tableLines.length; i++) {
      const values = tableLines[i]
        .split(separator)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      // Skip rows that don't match header count (might be section dividers)
      if (
        values.length === headers.length ||
        values.length >= headers.length - 1
      ) {
        rows.push(values.slice(0, headers.length));
      }
    }

    if (rows.length === 0) {
      return null;
    }

    return {
      pageIndex,
      headers,
      rows,
      confidence: 0.7, // Heuristic-based confidence
    };
  }

  /**
   * Use a vision model to detect tables in a PDF page image.
   * This is a more accurate method but requires converting pages to images.
   * TODO: Implement when pdf-to-image conversion is available.
   */
  private async detectTablesWithVision(
    pageImagePath: string,
  ): Promise<TableDetection[]> {
    // This would use GPT-4V or similar vision model
    // to detect table bounding boxes
    return [];
  }
}
