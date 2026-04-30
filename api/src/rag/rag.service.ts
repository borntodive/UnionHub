import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { OpenAI } from "openai";
import { DirectoryLoader } from "@langchain/classic/document_loaders/fs/directory";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatDto } from "./dto/chat.dto";
import {
  ChatResponse,
  RagStatus,
  DocumentCategory,
  ReindexProgress,
  ReindexPhase,
} from "./rag.types";

interface WikiEmbedding {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly openai: OpenAI;
  private readonly knowledgeBasePath: string;
  private lastReindexAt: Date | null = null;
  private reindexProgress: ReindexProgress = {
    isRunning: false,
    phase: "idle",
    current: 0,
    total: 0,
    message: "",
    percent: 0,
    estimatedTimeRemaining: 0,
  };
  private reindexStartTime: number | null = null;

  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource,
  ) {
    const apiKey = this.configService.get<string>("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not defined");
    }

    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });

    // Resolve knowledge-base path relative to the project root
    this.knowledgeBasePath =
      this.configService.get<string>("KNOWLEDGE_BASE_PATH") ||
      `${process.cwd()}/knowledge-base`;
  }

  /**
   * Get current reindex progress
   */
  getProgress(): ReindexProgress {
    return this.reindexProgress;
  }

  /**
   * Update reindex progress
   */
  private updateProgress(
    phase: ReindexPhase,
    current: number = 0,
    total: number = 0,
    message: string = "",
  ): void {
    // Initialize start time on first progress update
    if (phase === "discovering" && !this.reindexStartTime) {
      this.reindexStartTime = Date.now();
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining = 0;
    if (
      this.reindexStartTime &&
      current > 0 &&
      total > 0 &&
      phase === "embedding"
    ) {
      const elapsedSeconds = (Date.now() - this.reindexStartTime) / 1000;
      const chunksPerSecond = current / elapsedSeconds;
      const remainingChunks = total - current;

      if (chunksPerSecond > 0) {
        estimatedTimeRemaining = Math.round(remainingChunks / chunksPerSecond);
      }
    }

    // Reset start time when done or error
    if (phase === "done" || phase === "error" || phase === "idle") {
      this.reindexStartTime = null;
    }

    this.reindexProgress = {
      isRunning: phase !== "idle" && phase !== "done" && phase !== "error",
      phase,
      current,
      total,
      message,
      percent: total > 0 ? Math.round((current / total) * 100) : 0,
      estimatedTimeRemaining,
    };
  }

  /**
   * Index all markdown documents from the knowledge-base directory
   */
  async indexDocuments(): Promise<number> {
    try {
      this.logger.log("Starting document indexing...");
      this.updateProgress("discovering", 0, 0, "Scoperta categorie...");

      // Load all markdown files from knowledge-base directory
      const categories = await this.discoverCategories();
      this.logger.log(`Discovered categories: ${categories.join(", ")}`);
      this.updateProgress(
        "loading",
        0,
        categories.length,
        `Caricamento documenti da ${categories.length} categorie...`,
      );
      const allDocuments = [];

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const categoryPath = `${this.knowledgeBasePath}/${category}`;
        try {
          const loader = new DirectoryLoader(categoryPath, {
            ".md": (path: string) => new TextLoader(path),
          });
          const categoryDocs = await loader.load();
          allDocuments.push(...categoryDocs);
        } catch (error) {
          this.logger.warn(
            `Could not load category ${category}: ${error.message}`,
          );
        }
        this.updateProgress(
          "loading",
          i + 1,
          categories.length,
          `Caricamento categoria ${i + 1}/${categories.length}...`,
        );
      }

      if (allDocuments.length === 0) {
        this.logger.warn("No documents found in knowledge-base");
        this.updateProgress("error", 0, 0, "Nessun documento trovato");
        return 0;
      }

      this.logger.log(`Loaded ${allDocuments.length} documents`);
      this.updateProgress("splitting", 0, 0, "Divisione in chunk...");

      // Split documents into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
      });

      const chunks = await splitter.splitDocuments(allDocuments);

      this.logger.log(`Split into ${chunks.length} chunks`);
      this.updateProgress(
        "embedding",
        0,
        chunks.length,
        "Generazione embedding...",
      );

      // Generate embeddings for each chunk
      const embedModel =
        this.configService.get<string>("OPENROUTER_EMBEDDING_MODEL") ||
        "openai/text-embedding-3-small";

      const embeddingsToInsert: WikiEmbedding[] = [];

      this.logger.log("Starting embeddings generation...");

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        if (i % 10 === 0) {
          this.logger.log(`Processing chunk ${i + 1}/${chunks.length}`);
          this.updateProgress(
            "embedding",
            i + 1,
            chunks.length,
            `Elaborazione chunk ${i + 1}/${chunks.length}...`,
          );
        }

        const embedding = await this.generateEmbedding(
          chunk.pageContent,
          embedModel,
        );

        // Extract category from metadata source path
        const sourcePath = chunk.metadata.source as string;
        const pathParts = sourcePath.split("/");
        const category = pathParts[pathParts.length - 2] || "general"; // Second-to-last part is category
        const filename = pathParts[pathParts.length - 1] || "unknown";
        const documentTitle = filename.replace(".md", "");

        embeddingsToInsert.push({
          id: crypto.randomUUID(),
          content: chunk.pageContent,
          metadata: {
            source: sourcePath,
            category,
            filename,
            documentTitle,
            chunkIndex: i,
            totalChunks: chunks.length,
          },
          embedding,
        });
      }

      // Update progress before inserting
      this.updateProgress(
        "inserting",
        embeddingsToInsert.length,
        embeddingsToInsert.length,
        "Salvataggio nel database...",
      );

      // Insert embeddings into database
      await this.insertEmbeddings(embeddingsToInsert);

      this.lastReindexAt = new Date();
      this.updateProgress("done", chunks.length, chunks.length, "Completato");
      this.logger.log(
        `Indexed ${embeddingsToInsert.length} chunks from ${allDocuments.length} documents`,
      );

      return embeddingsToInsert.length;
    } catch (error) {
      this.logger.error("Error indexing documents:", error);
      this.logger.error(`Error details: ${error?.message || error}`);
      if (error?.stack) {
        this.logger.error(`Stack: ${error.stack}`);
      }
      this.updateProgress(
        "error",
        0,
        0,
        `Errore: ${error?.message || "Sconosciuto"}`,
      );
      throw new InternalServerErrorException(
        `Failed to index documents: ${error?.message || error}`,
      );
    }
  }

  /**
   * Clear all embeddings and reindex documents (runs in background)
   */
  async reindex(): Promise<{ started: true }> {
    // Reset progress
    this.updateProgress("discovering", 0, 0, "Pulizia database...");

    // Run in background - don't await
    setImmediate(async () => {
      try {
        // Delete all existing embeddings
        await this.dataSource.query(`DELETE FROM wiki_embeddings`);
        this.logger.log("Cleared all existing embeddings");

        // Reindex
        await this.indexDocuments();
      } catch (error) {
        this.logger.error("Background reindex failed:", error);
        this.updateProgress(
          "error",
          0,
          0,
          `Errore: ${error?.message || "Sconosciuto"}`,
        );
      }
    });

    return { started: true };
  }

  /**
   * Transform user query for better semantic search
   * This helps bridge the gap between natural language questions and technical document terms
   */
  private async transformQuery(question: string): Promise<string> {
    try {
      const chatModel =
        this.configService.get<string>("OPENROUTER_CHAT_MODEL") ||
        "anthropic/claude-sonnet-4-5";

      const completion = await this.openai.chat.completions.create({
        model: chatModel,
        messages: [
          {
            role: "user",
            content: `Riformula la seguente domanda per ottimizzare la ricerca in documenti tecnici aviation e contrattuali.

IMPORTANTE:
- Mantieni il significato originale
- Usa termini tecnici appropriati (es. "FTL" invece di "tempo di volo", "sector pay" invece di "paga per volo")
- Sii conciso e diretto
- Restituisci SOLO la domanda riformulata, niente altro

Domanda originale: "${question}"

Domanda riformulata:`,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent transformations
        max_tokens: 100,
      });

      const transformed =
        completion.choices[0]?.message?.content?.trim() || question;
      this.logger.debug(`Query transformed: "${question}" -> "${transformed}"`);
      return transformed;
    } catch (error) {
      this.logger.warn(
        `Query transformation failed, using original: ${error.message}`,
      );
      return question; // Fallback to original question
    }
  }

  /**
   * Chat with RAG - retrieve relevant chunks and generate answer
   */
  async chat(
    question: string,
    history: ChatDto["history"],
  ): Promise<ChatResponse> {
    try {
      // Transform query for better semantic search
      const transformedQuery = await this.transformQuery(question);

      // Generate embedding for the transformed question
      const embedModel =
        this.configService.get<string>("OPENROUTER_EMBEDDING_MODEL") ||
        "openai/text-embedding-3-small";

      const questionEmbedding = await this.generateEmbedding(
        transformedQuery,
        embedModel,
      );

      // Retrieve top 10 most relevant chunks using cosine similarity
      const relevantChunks = await this.findRelevantChunks(
        questionEmbedding,
        10,
      );

      if (relevantChunks.length === 0) {
        return {
          answer:
            "Mi dispiace, non ho trovato informazioni pertinenti nella base di conoscenza per rispondere alla tua domanda.",
          sources: [],
        };
      }

      // Build context from retrieved chunks
      const context = relevantChunks
        .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
        .join("\n\n");

      // Extract unique sources
      const uniqueSources = [
        ...new Set(
          relevantChunks.map(
            (chunk) => (chunk.metadata as { filename: string }).filename,
          ),
        ),
      ];

      // Build system prompt with improved instructions
      const systemPrompt = `Sei l'assistente ufficiale di UnionHub per i piloti Ryanair.
Rispondi SEMPRE in italiano, anche se i documenti di riferimento sono in inglese.

## COME RISPONDERE

1. **Basati ESCLUSIVAMENTE sul contesto fornito** - Non inventare informazioni
2. **Se l'informazione non c'è**: dì chiaramente "Questa informazione non è presente nei documenti disponibili"
3. **Sii specifico**: Usa numeri, date e valori esatti dal contesto
4. **Cita le fonti**: Usa [1], [2] per riferirti ai chunk numerati del contesto

## ESEMPI DI RISPOSTE

❌ SBAGLIATO: "Il limite di volo è circa 100 ore"
✅ GIUSTO: "Secondo il chunk [1], il limite di volo mensile è 100 ore"

❌ SBAGLIATO: "Non lo so"
✅ GIUSTO: "I documenti disponibili non contengono informazioni su X"

❌ SBAGLIATO: "Dipende..."
✅ GIUSTO: "Secondo [2], per i voli di corto raggio vale X, mentre per lungo raggio vale Y"

## DOMANDE CALCOLISTICHE

Se la domanda richiede un calcolo (es. stipendio, ore, indennità):
1. Spiega la formula usata
2. Mostra i passaggi del calcolo
3. Fornisci il risultato numerico finale

Esempio: "Per calcolare lo stipendio base: [formula]. Con 80 ore di volo: 80 × €78 = €6.240"

## CONTESTO FORNITO

${context}`;

      // Build conversation history
      // Note: Some models (like Google Gemma) don't support system role via OpenAI API,
      // so we include it as the first user message instead
      const messages: Array<{
        role: "user" | "assistant";
        content: string;
      }> = [
        { role: "user", content: systemPrompt },
        {
          role: "assistant",
          content: "Ho capito. Risponderò basandomi solo sul contesto fornito.",
        },
        ...history.slice(-10).map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: question },
      ];

      // Generate answer using LLM
      const chatModel =
        this.configService.get<string>("OPENROUTER_CHAT_MODEL") ||
        "anthropic/claude-sonnet-4-5";

      const completion = await this.openai.chat.completions.create({
        model: chatModel,
        messages,
      });

      const answer = completion.choices[0]?.message?.content || "";

      return {
        answer,
        sources: uniqueSources,
      };
    } catch (error) {
      this.logger.error("Error in chat:", error);
      throw new InternalServerErrorException("Failed to process chat request");
    }
  }

  /**
   * Get current RAG status
   */
  async getStatus(): Promise<RagStatus> {
    const result = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM wiki_embeddings`,
    );

    const totalChunks = parseInt(result[0]?.count || "0", 10);

    return {
      lastReindexAt: this.lastReindexAt?.toISOString() || null,
      totalChunks,
    };
  }

  /**
   * List all documents in the knowledge base by category
   */
  async listDocuments(): Promise<{ categories: DocumentCategory[] }> {
    const categories: DocumentCategory[] = [];
    const categoryNames = await this.discoverCategories();

    for (const categoryName of categoryNames) {
      const categoryPath = `${this.knowledgeBasePath}/${categoryName}`;
      try {
        const fs = await import("node:fs/promises");
        const files = await fs.readdir(categoryPath);
        const mdFiles = files.filter((f) => f.endsWith(".md"));
        categories.push({
          name: categoryName,
          files: mdFiles,
        });
      } catch (error) {
        // Category directory may not exist
        categories.push({
          name: categoryName,
          files: [],
        });
      }
    }

    return { categories };
  }

  /**
   * Discover all subdirectories in knowledge-base that contain markdown files
   */
  private async discoverCategories(): Promise<string[]> {
    const fs = await import("node:fs/promises");
    const categories: string[] = [];

    try {
      const entries = await fs.readdir(this.knowledgeBasePath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const categoryPath = `${this.knowledgeBasePath}/${entry.name}`;
          try {
            const files = await fs.readdir(categoryPath);
            const hasMarkdownFiles = files.some((f) => f.endsWith(".md"));
            if (hasMarkdownFiles) {
              categories.push(entry.name);
            }
          } catch {
            // Directory non accessibile, skip
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error reading knowledge-base directory: ${error.message}`,
      );
    }

    return categories.sort(); // Ordine alfabetico per consistenza
  }

  /**
   * Generate embedding using OpenRouter
   */
  private async generateEmbedding(
    text: string,
    model: string,
  ): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model,
      input: text,
    });

    return response.data[0]?.embedding || [];
  }

  /**
   * Insert embeddings into database
   */
  private async insertEmbeddings(embeddings: WikiEmbedding[]): Promise<void> {
    const query = `
            INSERT INTO wiki_embeddings (id, content, metadata, embedding)
            VALUES ($1, $2, $3, $4)
        `;

    for (const emb of embeddings) {
      // Convert embedding array to PostgreSQL vector format
      const vectorStr = `[${emb.embedding.join(",")}]`;
      await this.dataSource.query(query, [
        emb.id,
        emb.content,
        JSON.stringify(emb.metadata),
        vectorStr,
      ]);
    }
  }

  /**
   * Find relevant chunks using cosine similarity
   */
  private async findRelevantChunks(
    embedding: number[],
    limit: number,
  ): Promise<Array<{ content: string; metadata: Record<string, unknown> }>> {
    const vectorStr = `[${embedding.join(",")}]`;

    const query = `
            SELECT content, metadata, 1 - (embedding <=> $1::vector) as similarity
            FROM wiki_embeddings
            ORDER BY embedding <=> $1::vector
            LIMIT $2
        `;

    const results = await this.dataSource.query(query, [vectorStr, limit]);

    return results.map((row: unknown) => ({
      content: (row as { content: string }).content,
      metadata: (row as { metadata: Record<string, unknown> }).metadata,
    }));
  }
}
