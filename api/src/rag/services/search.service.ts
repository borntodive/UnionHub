import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Chunk } from "../entities/chunk.entity";
import { PythonRagClientService } from "./python-rag-client.service";
import { RetrievalMode } from "../dto/ask-query.dto";

export interface ScoredChunk {
  chunkId: string;
  documentId: string;
  sectionCode: string | null;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  chunkType: string;
  textContent: string;
  tableJson: object | null;
  score: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Chunk)
    private readonly chunkRepo: Repository<Chunk>,
    private readonly dataSource: DataSource,
    private readonly pythonClient: PythonRagClientService,
  ) {}

  async search(
    question: string,
    documentIds: string[] | undefined,
    topK: number,
    mode: RetrievalMode = RetrievalMode.HYBRID,
  ): Promise<ScoredChunk[]> {
    switch (mode) {
      case RetrievalMode.LEXICAL:
        return this.lexicalSearch(question, documentIds, topK);
      case RetrievalMode.SEMANTIC:
        return this.semanticSearch(question, documentIds, topK);
      case RetrievalMode.HYBRID:
      default:
        return this.hybridSearch(question, documentIds, topK);
    }
  }

  private async semanticSearch(
    question: string,
    documentIds: string[] | undefined,
    topK: number,
  ): Promise<ScoredChunk[]> {
    const [queryVector] = await this.pythonClient.embedBatch([question]);
    const vectorLiteral = `[${queryVector.join(",")}]`;

    let sql = `
      SELECT
        c.id             AS "chunkId",
        c."documentId",
        c."sectionCode",
        c."sectionTitle",
        c."pageStart",
        c."pageEnd",
        c."chunkType",
        c."textContent",
        c."tableJson",
        (1 - (e.embedding <=> $1::vector)) AS score
      FROM chunks c
      JOIN chunk_embeddings e ON e."chunkId" = c.id
    `;
    const params: unknown[] = [vectorLiteral];

    if (documentIds && documentIds.length > 0) {
      params.push(documentIds);
      sql += ` WHERE c."documentId" = ANY($${params.length}::uuid[])`;
    }

    sql += ` ORDER BY e.embedding <=> $1::vector LIMIT ${topK}`;

    const rows: ScoredChunk[] = await this.dataSource.query(sql, params);
    return rows;
  }

  private async lexicalSearch(
    question: string,
    documentIds: string[] | undefined,
    topK: number,
  ): Promise<ScoredChunk[]> {
    const qb = this.chunkRepo
      .createQueryBuilder("c")
      .select([
        'c.id AS "chunkId"',
        'c."documentId"',
        'c."sectionCode"',
        'c."sectionTitle"',
        'c."pageStart"',
        'c."pageEnd"',
        'c."chunkType"',
        'c."textContent"',
        'c."tableJson"',
        `ts_rank(c."searchVector", plainto_tsquery('simple', :q)) AS score`,
      ])
      .where(`c."searchVector" @@ plainto_tsquery('simple', :q)`, {
        q: question,
      })
      .orderBy("score", "DESC")
      .limit(topK);

    if (documentIds && documentIds.length > 0) {
      qb.andWhere(`c."documentId" = ANY(:ids)`, { ids: documentIds });
    }

    return qb.getRawMany<ScoredChunk>();
  }

  private async hybridSearch(
    question: string,
    documentIds: string[] | undefined,
    topK: number,
  ): Promise<ScoredChunk[]> {
    const [semantic, lexical] = await Promise.all([
      this.semanticSearch(question, documentIds, topK * 2),
      this.lexicalSearch(question, documentIds, topK * 2),
    ]);

    // Reciprocal Rank Fusion (k=60)
    const k = 60;
    const scores = new Map<string, { chunk: ScoredChunk; rrfScore: number }>();

    semantic.forEach((chunk, rank) => {
      const current = scores.get(chunk.chunkId);
      const rrfScore = 1 / (k + rank + 1);
      if (current) {
        current.rrfScore += rrfScore;
      } else {
        scores.set(chunk.chunkId, { chunk, rrfScore });
      }
    });

    lexical.forEach((chunk, rank) => {
      const current = scores.get(chunk.chunkId);
      const rrfScore = 1 / (k + rank + 1);
      if (current) {
        current.rrfScore += rrfScore;
      } else {
        scores.set(chunk.chunkId, { chunk, rrfScore });
      }
    });

    return Array.from(scores.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, topK)
      .map(({ chunk, rrfScore }) => ({ ...chunk, score: rrfScore }));
  }
}
