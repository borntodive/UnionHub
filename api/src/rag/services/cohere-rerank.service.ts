import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface CohereRerankRequest {
  query: string;
  documents: Array<{ text: string }>;
  top_n?: number;
  model?: string;
}

interface CohereRerankResponse {
  id: string;
  results: Array<{
    index: number;
    relevance_score: number;
    text?: string;
  }>;
  meta: {
    api_version: { version: string };
    billed_units: { search_units: number };
    tokens: { input_tokens: number; output_tokens: number };
  };
}

export interface RerankResult {
  index: number; // Original index in input array
  score: number; // Relevance score 0-1
  text: string;
}

@Injectable()
export class CohereRerankService {
  private readonly logger = new Logger(CohereRerankService.name);
  private readonly apiKey: string;
  private readonly baseURL = "https://openrouter.ai/api/v1";
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("OPENROUTER_API_KEY") || "";
    if (!this.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Cohere rerank model - supports multilingual and has excellent aviation domain performance
    this.model =
      this.configService.get<string>("COHERE_RERANK_MODEL") ||
      "cohere/rerank-3"; // also available: cohere/rerank-3-multilingual
  }

  async rerank(
    query: string,
    documents: string[],
    topK: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) {
      return [];
    }

    const effectiveTopK = Math.min(topK, documents.length);

    this.logger.debug(
      `Reranking ${documents.length} documents with query: "${query.slice(0, 100)}..."`,
    );

    try {
      const requestBody: CohereRerankRequest = {
        query,
        documents: documents.map((text) => ({ text })),
        top_n: effectiveTopK,
        model: this.model,
      };

      const response = await fetch(`${this.baseURL}/cohere/v1/rerank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://unionhub.cisl.it",
          "X-Title": "UnionHub RAG",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `Cohere rerank API error (${response.status}): ${errorText}`,
        );
        throw new Error(`Rerank API error: ${response.status}`);
      }

      const data: CohereRerankResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        this.logger.warn("Reranking returned no results");
        return this.fallbackRerank(documents, effectiveTopK);
      }

      const results: RerankResult[] = data.results.map((result) => ({
        index: result.index,
        score: result.relevance_score,
        text: documents[result.index],
      }));

      this.logger.debug(
        `Reranked ${results.length} documents, top score: ${results[0]?.score.toFixed(4)}`,
      );

      return results;
    } catch (error: any) {
      this.logger.warn(
        `Cohere reranking failed: ${error?.message || error}, using fallback`,
      );
      return this.fallbackRerank(documents, effectiveTopK);
    }
  }

  /**
   * Fallback reranking using simple keyword matching and query term overlap.
   * Used when the Cohere API is unavailable.
   */
  private fallbackRerank(documents: string[], topK: number): RerankResult[] {
    const queryTerms = this.extractTerms("");

    const scored = documents.map((text, idx) => {
      const score = this.computeKeywordScore(queryTerms, text);
      return { index: idx, score, text };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  private extractTerms(query: string): Set<string> {
    // Extract meaningful terms (lowercase, alphanumeric)
    return new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 2)
        .filter((t) => /^[a-z0-9àèéìòù]+$/i.test(t)),
    );
  }

  private computeKeywordScore(queryTerms: Set<string>, text: string): number {
    const lowerText = text.toLowerCase();
    let matches = 0;
    for (const term of queryTerms) {
      if (lowerText.includes(term)) matches++;
    }
    return queryTerms.size > 0 ? matches / queryTerms.size : 0;
  }

  /**
   * Check if the reranker service is available.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/cohere/v1/rerank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query: "test",
          documents: [{ text: "test document" }],
          top_n: 1,
          model: this.model,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
