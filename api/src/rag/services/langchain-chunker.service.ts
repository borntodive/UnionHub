import { Injectable, Logger } from "@nestjs/common";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface ChunkItem {
  sectionCode: string | null;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  chunkIndex: number;
  textContent: string;
  tokenCount: number;
}

@Injectable()
export class LangChainChunkerService {
  private readonly logger = new Logger(LangChainChunkerService.name);
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 512,
      chunkOverlap: 64,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
  }

  async splitSection(
    text: string,
    sectionCode: string | null = null,
    sectionTitle: string | null = null,
    pageStart: number | null = null,
    pageEnd: number | null = null,
  ): Promise<ChunkItem[]> {
    try {
      const chunks = await this.splitter.splitText(text);
      return chunks.map((content: string, idx: number) => ({
        sectionCode,
        sectionTitle,
        pageStart,
        pageEnd,
        chunkIndex: idx,
        textContent: content,
        tokenCount: Math.ceil(content.length / 4), // Rough estimate
      }));
    } catch (error) {
      this.logger.error(`Failed to split section: ${error}`);
      throw error;
    }
  }

  async splitText(text: string): Promise<string[]> {
    try {
      return await this.splitter.splitText(text);
    } catch (error) {
      this.logger.error(`Failed to split text: ${error}`);
      throw error;
    }
  }
}
