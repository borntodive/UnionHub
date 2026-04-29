import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
const { pdf: pdfToImg } = require("pdf-to-img");

export interface DetectedTable {
  pageIndex: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface ExtractedTable {
  pageIndex: number;
  headers: string[];
  rows: string[][];
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface TableDetectionResponse {
  tables: Array<{
    pageIndex: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
    confidence: number;
  }>;
}

export interface TableExtractionResponse {
  headers: string[];
  rows: string[][];
  confidence: number;
}

@Injectable()
export class VisionTableExtractorService {
  private readonly logger = new Logger(VisionTableExtractorService.name);
  private readonly apiKey: string;
  private readonly baseURL = "https://openrouter.ai/api/v1";
  private readonly visionModel: string;
  private readonly tempDir: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("OPENROUTER_API_KEY") || "";
    this.visionModel =
      this.configService.get<string>("VISION_TABLE_MODEL") || "openai/gpt-4o"; // Excellent vision capabilities (paid)

    // Create temp directory for page images
    this.tempDir = path.join(process.cwd(), "temp", "pdf-pages");
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  /**
   * Extract tables from PDF using vision-based detection.
   * This is the main entry point for vision-based table extraction.
   */
  async extractTablesFromPdf(
    pdfPath: string,
    options: {
      maxPages?: number;
      skipHeuristic?: boolean;
    } = {},
  ): Promise<ExtractedTable[]> {
    const { maxPages = 50, skipHeuristic = false } = options;

    try {
      this.logger.log(`Starting vision-based table extraction for ${pdfPath}`);

      // Step 1: Detect tables in PDF pages
      const detections = await this.detectTablesInPdf(pdfPath, maxPages);
      this.logger.log(`Detected ${detections.length} table candidates`);

      if (detections.length === 0) {
        this.logger.warn("No tables detected in PDF");
        return [];
      }

      // Step 2: Extract table structure for each detection
      const tables: ExtractedTable[] = [];
      for (const detection of detections) {
        try {
          const table = await this.extractTableStructure(pdfPath, detection);
          if (table) {
            tables.push(table);
          }
        } catch (err: any) {
          this.logger.warn(
            `Failed to extract table at page ${detection.pageIndex}: ${err.message}`,
          );
        }
      }

      this.logger.log(`Successfully extracted ${tables.length} tables`);
      return tables;
    } catch (error: any) {
      this.logger.error(`Vision table extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect tables in PDF pages using vision model.
   */
  private async detectTablesInPdf(
    pdfPath: string,
    maxPages: number,
  ): Promise<DetectedTable[]> {
    const detections: DetectedTable[] = [];

    try {
      // Convert PDF pages to images
      const pageImages = await this.convertPdfToImages(pdfPath, maxPages);
      this.logger.log(`Converted ${pageImages.length} pages to images`);

      // Process each page with vision model
      for (const { pageIndex, imagePath } of pageImages) {
        try {
          const pageDetections = await this.detectTablesInPage(
            imagePath,
            pageIndex,
          );
          detections.push(...pageDetections);

          // Add delay between pages to avoid rate limiting
          if (pageIndex < pageImages.length - 1) {
            await this.sleep(500); // 500ms between pages
          }
        } catch (err: any) {
          this.logger.warn(
            `Failed to detect tables in page ${pageIndex}: ${err.message}`,
          );
        }

        // Clean up temp image
        try {
          fs.unlinkSync(imagePath);
        } catch {
          // Ignore cleanup errors
        }
      }

      return detections;
    } catch (error: any) {
      this.logger.error(`PDF to image conversion failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Convert PDF pages to images for vision processing.
   */
  private async convertPdfToImages(
    pdfPath: string,
    maxPages: number,
  ): Promise<Array<{ pageIndex: number; imagePath: string }>> {
    const images: Array<{ pageIndex: number; imagePath: string }> = [];

    try {
      // pdf-to-img is a factory function that returns a Promise resolving to an async iterable
      const converter = await pdfToImg(pdfPath, {
        scale: 2.0, // Higher scale for better OCR
        quality: 90,
      });

      let pageIndex = 0;
      for await (const image of converter) {
        if (pageIndex >= maxPages) {
          break;
        }

        const imagePath = path.join(
          this.tempDir,
          `page-${Date.now()}-${pageIndex}.png`,
        );
        fs.writeFileSync(imagePath, image);
        images.push({ pageIndex, imagePath });
        pageIndex++;
      }

      return images;
    } catch (error: any) {
      this.logger.error(`PDF to image conversion error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect tables in a single page image using vision model.
   */
  private async detectTablesInPage(
    imagePath: string,
    pageIndex: number,
  ): Promise<DetectedTable[]> {
    try {
      const imageBase64 = fs.readFileSync(imagePath, "base64");

      const prompt = `Analyze this image and identify any tables.
Return ONLY a JSON object with this exact format:
{
  "tables": [
    {"bbox": [x, y, width, height], "confidence": 0.95}
  ]
}
Where bbox is [x, y, width, height] as percentages of image dimensions (0-100).
If no tables are found, return {"tables": []}.
Do NOT include any explanation outside the JSON.`;

      const response = await this.callVisionModel(imageBase64, prompt);

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(
          `No valid JSON in vision response for page ${pageIndex}`,
        );
        return [];
      }

      const result: TableDetectionResponse = JSON.parse(jsonMatch[0]);

      return (result.tables || []).map((t) => ({
        pageIndex,
        boundingBox: {
          x: t.bbox[0],
          y: t.bbox[1],
          width: t.bbox[2],
          height: t.bbox[3],
        },
        confidence: t.confidence,
      }));
    } catch (error: any) {
      this.logger.error(
        `Table detection failed for page ${pageIndex}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Extract table structure from a detected table region.
   */
  private async extractTableStructure(
    pdfPath: string,
    detection: DetectedTable,
  ): Promise<ExtractedTable | null> {
    try {
      // Convert the specific page to image
      const pageImages = await this.convertPdfToImages(
        pdfPath,
        detection.pageIndex + 1,
      );
      if (pageImages.length === 0) {
        return null;
      }

      const pageImage = pageImages[detection.pageIndex];
      const imageBase64 = fs.readFileSync(pageImage.imagePath, "base64");

      const prompt = `Extract the complete table structure from this image.
Return ONLY a JSON object with this exact format:
{
  "headers": ["Column 1", "Column 2", ...],
  "rows": [["Value 1", "Value 2", ...], ["Value 3", "Value 4", ...]],
  "confidence": 0.95
}
Rules:
- Preserve exact cell values including numbers
- Use empty string "" for empty cells
- headers is the first row
- Include ALL data rows
- confidence is your certainty (0-1)
Do NOT include any explanation outside the JSON.`;

      const response = await this.callVisionModel(imageBase64, prompt);

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const result: TableExtractionResponse = JSON.parse(jsonMatch[0]);

      // Validate result
      if (!result.headers || !result.rows || result.headers.length < 2) {
        return null;
      }

      // Clean up temp image
      try {
        fs.unlinkSync(pageImage.imagePath);
      } catch {
        // Ignore
      }

      return {
        pageIndex: detection.pageIndex,
        headers: result.headers,
        rows: result.rows,
        confidence: Math.min(detection.confidence, result.confidence),
        boundingBox: detection.boundingBox,
      };
    } catch (error: any) {
      this.logger.error(`Table structure extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Call vision model with base64 image.
   * Includes retry logic for 503 errors with exponential backoff.
   */
  private async callVisionModel(
    imageBase64: string,
    prompt: string,
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://unionhub.cisl.it",
            "X-Title": "UnionHub RAG",
          },
          body: JSON.stringify({
            model: this.visionModel,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${imageBase64}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 4096,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices[0]?.message?.content || "";
        }

        const status = response.status;
        const errorText = await response.text();

        // Retry on 503 (service unavailable) or 429 (rate limit)
        if (status === 503 || status === 429) {
          lastError = new Error(`Vision API error: ${status} ${errorText}`);
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          this.logger.warn(
            `Vision API returned ${status}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await this.sleep(delayMs);
          continue;
        }

        throw new Error(`Vision API error: ${status} ${errorText}`);
      } catch (error: any) {
        if (
          error.message.includes("Vision API error: 503") ||
          error.message.includes("Vision API error: 429")
        ) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error("Vision API failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check to verify the service is working.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Create a simple test image (1x1 white PNG)
      const testImageBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const response = await this.callVisionModel(
        testImageBase64,
        "Reply with just: OK",
      );

      return response.toLowerCase().includes("ok");
    } catch {
      return false;
    }
  }
}
