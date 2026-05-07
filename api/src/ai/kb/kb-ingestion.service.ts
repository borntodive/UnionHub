import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PythonRagProvider } from "../providers/python-rag.provider";

export interface IngestStats {
  pagesUpserted: number;
  pagesSkipped: number;
  filesProcessed: number;
  durationMs: number;
}

const BATCH_SIZE = 20;

@Injectable()
export class KbIngestionService {
  private readonly logger = new Logger(KbIngestionService.name);
  private readonly kbPath: string;

  constructor(
    private readonly config: ConfigService,
    private readonly pythonRag: PythonRagProvider,
    @InjectDataSource() private readonly db: DataSource,
  ) {
    this.kbPath =
      config.get<string>("KNOWLEDGE_BASE_PATH") ??
      path.join(process.cwd(), "knowledge-base");
  }

  async ingestAll(): Promise<IngestStats> {
    const start = Date.now();
    const files = await this.discoverFiles();
    this.logger.log(`Ingesting ${files.length} files from ${this.kbPath}`);

    let pagesUpserted = 0;
    let pagesSkipped = 0;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const pages = await this.loadPages(batch);

      const texts = pages.map((p) => p.content);
      let embeddings: number[][];
      try {
        embeddings = await this.pythonRag.embedBatch(texts);
      } catch (err) {
        this.logger.error(`Embed batch failed: ${(err as Error).message}`);
        pagesSkipped += pages.length;
        continue;
      }

      for (let j = 0; j < pages.length; j++) {
        const page = pages[j];
        const embedding = embeddings[j];
        try {
          await this.upsertPage(page, embedding);
          pagesUpserted++;
        } catch (err) {
          this.logger.error(
            `Upsert failed for ${page.slug}: ${(err as Error).message}`,
          );
          pagesSkipped++;
        }
      }

      this.logger.log(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${pages.length} pages embedded`,
      );
    }

    return {
      pagesUpserted,
      pagesSkipped,
      filesProcessed: files.length,
      durationMs: Date.now() - start,
    };
  }

  private async discoverFiles(): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir(this.kbPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dir = path.join(this.kbPath, entry.name);
          const dirFiles = await fs.readdir(dir);
          for (const f of dirFiles) {
            if (f.endsWith(".md")) files.push(path.join(dir, f));
          }
        } else if (entry.name.endsWith(".md")) {
          files.push(path.join(this.kbPath, entry.name));
        }
      }
    } catch (err) {
      this.logger.error(
        `Cannot read KB path ${this.kbPath}: ${(err as Error).message}`,
      );
    }
    return files;
  }

  private async loadPages(filePaths: string[]): Promise<
    Array<{
      slug: string;
      title: string;
      category: string;
      content: string;
      sourcePath: string;
    }>
  > {
    const pages = [];
    for (const filePath of filePaths) {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const parts = filePath.split(path.sep);
        const filename = parts[parts.length - 1].replace(".md", "");
        const category = parts[parts.length - 2] ?? "general";
        const slug = this.slugify(`${category}-${filename}`);
        const title = filename.replace(/-/g, " ");

        pages.push({
          slug,
          title,
          category,
          content: raw,
          sourcePath: filePath,
        });
      } catch {
        // skip unreadable files
      }
    }
    return pages;
  }

  private async upsertPage(
    page: {
      slug: string;
      title: string;
      category: string;
      content: string;
      sourcePath: string;
    },
    embedding: number[],
  ): Promise<void> {
    const vectorStr = `[${embedding.join(",")}]`;
    await this.db.query(
      `INSERT INTO wiki_pages (slug, title, content, path, category, tags, source_document, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9)
       ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title,
             content = EXCLUDED.content,
             embedding = EXCLUDED.embedding,
             updated_at = NOW()`,
      [
        page.slug,
        page.title,
        page.content,
        `${page.category}/${page.slug}.md`,
        page.category,
        [],
        page.sourcePath,
        vectorStr,
        JSON.stringify({ ingestedBy: "kb-ingestion-v2" }),
      ],
    );
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
