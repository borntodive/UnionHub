import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PythonRagProvider } from "../providers/python-rag.provider";

export type IngestPhase =
  | "idle"
  | "discovering"
  | "embedding"
  | "saving"
  | "done"
  | "error";

export interface IngestProgress {
  isRunning: boolean;
  phase: IngestPhase;
  current: number;
  total: number;
  percent: number;
  message: string;
}

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

  private progress: IngestProgress = {
    isRunning: false,
    phase: "idle",
    current: 0,
    total: 0,
    percent: 0,
    message: "",
  };

  constructor(
    private readonly config: ConfigService,
    private readonly pythonRag: PythonRagProvider,
    @InjectDataSource() private readonly db: DataSource,
  ) {
    this.kbPath =
      config.get<string>("KNOWLEDGE_BASE_PATH") ??
      path.join(process.cwd(), "knowledge-base");
  }

  getProgress(): IngestProgress {
    return { ...this.progress };
  }

  /** Fire-and-forget. Returns true if started, false if already running. */
  startIngest(): boolean {
    if (this.progress.isRunning) return false;
    void this.runIngest();
    return true;
  }

  private setProgress(patch: Partial<IngestProgress>): void {
    this.progress = { ...this.progress, ...patch };
  }

  private async runIngest(): Promise<void> {
    const start = Date.now();
    this.setProgress({
      isRunning: true,
      phase: "discovering",
      current: 0,
      total: 0,
      percent: 0,
      message: "Scoperta file...",
    });

    let files: string[] = [];
    try {
      files = await this.discoverFiles();
    } catch (err) {
      this.setProgress({
        isRunning: false,
        phase: "error",
        message: `Errore scoperta: ${(err as Error).message}`,
      });
      return;
    }

    if (files.length === 0) {
      this.setProgress({
        isRunning: false,
        phase: "done",
        total: 0,
        percent: 100,
        message: "Nessun file trovato.",
      });
      return;
    }

    // Load all chunks first, then batch on chunks (not files)
    const allPages = await this.loadPages(files);
    this.logger.log(
      `Ingesting ${files.length} files → ${allPages.length} chunks from ${this.kbPath}`,
    );
    this.setProgress({
      phase: "embedding",
      total: allPages.length,
      message: `Embedding ${allPages.length} chunk...`,
    });

    let pagesUpserted = 0;
    let pagesSkipped = 0;
    let processed = 0;

    for (let i = 0; i < allPages.length; i += BATCH_SIZE) {
      const pages = allPages.slice(i, i + BATCH_SIZE);

      this.setProgress({
        phase: "embedding",
        current: processed,
        percent: Math.round((processed / allPages.length) * 80),
        message: `Embedding chunk ${processed + 1}–${Math.min(processed + pages.length, allPages.length)} di ${allPages.length}...`,
      });

      const texts = pages.map((p) => p.content);
      let embeddings: number[][];
      try {
        embeddings = await this.pythonRag.embedBatch(texts);
      } catch (err) {
        this.logger.error(`Embed batch failed: ${(err as Error).message}`);
        pagesSkipped += pages.length;
        processed += pages.length;
        continue;
      }

      this.setProgress({
        phase: "saving",
        message: `Salvataggio batch ${Math.floor(i / BATCH_SIZE) + 1}...`,
      });

      for (let j = 0; j < pages.length; j++) {
        try {
          await this.upsertPage(pages[j], embeddings[j]);
          pagesUpserted++;
        } catch (err) {
          this.logger.error(
            `Upsert failed for ${pages[j].slug}: ${(err as Error).message}`,
          );
          pagesSkipped++;
        }
      }

      processed += pages.length;
      this.logger.log(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${pages.length} chunks embedded (${processed}/${allPages.length})`,
      );
    }

    const durationMs = Date.now() - start;
    this.logger.log(
      `Ingest done: ${pagesUpserted} upserted, ${pagesSkipped} skipped in ${durationMs}ms`,
    );
    this.setProgress({
      isRunning: false,
      phase: "done",
      current: files.length,
      total: files.length,
      percent: 100,
      message: `Completato: ${pagesUpserted} pagine indicizzate, ${pagesSkipped} saltate`,
    });
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
    const pages: Array<{
      slug: string;
      title: string;
      category: string;
      content: string;
      sourcePath: string;
    }> = [];
    for (const filePath of filePaths) {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const parts = filePath.split(path.sep);
        const filename = parts[parts.length - 1].replace(".md", "");
        const category = parts[parts.length - 2] ?? "general";
        const fileTitle = filename.replace(/-/g, " ");

        const chunks = this.chunkMarkdown(raw, fileTitle);
        chunks.forEach((chunk, idx) => {
          const slug =
            chunks.length === 1
              ? this.slugify(`${category}-${filename}`)
              : this.slugify(`${category}-${filename}-${idx + 1}`);
          pages.push({
            slug,
            title: chunk.title,
            category,
            content: chunk.content,
            sourcePath: filePath,
          });
        });
      } catch {
        // skip unreadable files
      }
    }
    return pages;
  }

  /**
   * Split markdown into chunks of ~MAX_CHARS, breaking at heading boundaries.
   * Each chunk keeps the heading as its title.
   */
  private chunkMarkdown(
    raw: string,
    fileTitle: string,
    maxChars = 4_000,
  ): Array<{ title: string; content: string }> {
    // Split at headings (##, ###, etc.)
    const sections = raw.split(/(?=^#{1,3} )/m).filter((s) => s.trim());

    if (sections.length === 0) return [{ title: fileTitle, content: raw }];

    const chunks: Array<{ title: string; content: string }> = [];
    let buffer = "";
    let bufferTitle = fileTitle;

    for (const section of sections) {
      const headingMatch = section.match(/^#{1,3} (.+)/);
      const sectionTitle = headingMatch
        ? `${fileTitle} — ${headingMatch[1].trim()}`
        : bufferTitle;

      if (buffer.length + section.length > maxChars && buffer.length > 0) {
        chunks.push({ title: bufferTitle, content: buffer.trim() });
        buffer = section;
        bufferTitle = sectionTitle;
      } else {
        if (buffer.length === 0) bufferTitle = sectionTitle;
        buffer += (buffer ? "\n\n" : "") + section;
      }
    }

    if (buffer.trim()) {
      chunks.push({ title: bufferTitle, content: buffer.trim() });
    }

    return chunks.length > 0 ? chunks : [{ title: fileTitle, content: raw }];
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
