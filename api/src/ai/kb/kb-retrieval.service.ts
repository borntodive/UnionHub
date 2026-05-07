import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { PythonRagProvider } from "../providers/python-rag.provider";

export interface RetrievedPage {
  title: string;
  content: string;
  slug: string;
  similarity: number;
}

const VECTOR_TOP_K = 20;
const RERANK_TOP_N = 5;

@Injectable()
export class KbRetrievalService {
  private readonly logger = new Logger(KbRetrievalService.name);

  constructor(
    private readonly pythonRag: PythonRagProvider,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async retrieve(query: string): Promise<RetrievedPage[]> {
    // 1. Embed the query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.pythonRag.embed(query);
    } catch (err) {
      this.logger.error(`Query embed failed: ${(err as Error).message}`);
      return [];
    }

    // 2. Vector search — top K candidates
    const candidates = await this.vectorSearch(queryEmbedding, VECTOR_TOP_K);
    if (candidates.length === 0) return [];

    // 3. Rerank candidates
    try {
      const passages = candidates.map((c) => c.content);
      const ranked = await this.pythonRag.rerank(query, passages, RERANK_TOP_N);
      return ranked.map((r) => ({
        ...candidates[r.index],
        similarity: r.score,
      }));
    } catch (err) {
      this.logger.warn(
        `Rerank failed, falling back to vector order: ${(err as Error).message}`,
      );
      return candidates.slice(0, RERANK_TOP_N);
    }
  }

  private async vectorSearch(
    embedding: number[],
    limit: number,
  ): Promise<RetrievedPage[]> {
    const vectorStr = `[${embedding.join(",")}]`;
    const rows = await this.db.query(
      `SELECT slug, title, content,
              1 - (embedding <=> $1::vector) AS similarity
       FROM wiki_pages
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    );

    return rows.map(
      (r: {
        slug: string;
        title: string;
        content: string;
        similarity: number;
      }) => ({
        slug: r.slug,
        title: r.title,
        content: r.content,
        similarity: r.similarity,
      }),
    );
  }
}
