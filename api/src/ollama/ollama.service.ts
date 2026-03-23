import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly chatbotModel: string;
  private readonly embedModel: string;
  private readonly apiKey: string | undefined;
  private readonly isCloud: boolean;

  constructor(private configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>("OLLAMA_URL") || "http://localhost:11434";
    this.model = this.configService.get<string>("OLLAMA_MODEL") || "llama3.2";
    this.chatbotModel =
      this.configService.get<string>("OLLAMA_CHATBOT_MODEL") || this.model;
    this.embedModel =
      this.configService.get<string>("OLLAMA_EMBED_MODEL") ||
      "nomic-embed-text";
    this.apiKey = this.configService.get<string>("OLLAMA_API_KEY");
    this.isCloud = this.configService.get<boolean>("OLLAMA_CLOUD") || false;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Generate a response from Ollama.
   * @param model Override model (defaults to OLLAMA_MODEL)
   */
  async generate(
    prompt: string,
    system?: string,
    model?: string,
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: model ?? this.model,
          prompt,
          system,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${error}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response.trim();
    } catch (error) {
      this.logger.error("Ollama generation failed:", error.message);
      throw error;
    }
  }

  /**
   * Detect whether a string is HTML (from the rich text editor)
   */
  private isHtml(text: string): boolean {
    return text.trim().startsWith("<");
  }

  /**
   * Rewrite text as a union communication.
   * If the input is HTML, the output must preserve the HTML tag structure.
   */
  async rewriteAsUnionCommunication(text: string): Promise<string> {
    const html = this.isHtml(text);

    const systemPrompt = html
      ? `Sei un assistente specializzato nella redazione di comunicati sindacali per la CISL.

Il testo ti viene fornito in formato HTML. Riscrivi il contenuto come un comunicato sindacale professionale, mantenendo:
- Tono formale ma accessibile
- Struttura chiara con introduzione, sviluppo e conclusione
- Linguaggio appropriato per comunicazioni ufficiali

REGOLA FONDAMENTALE: Restituisci SOLO HTML valido. Preserva esattamente la struttura dei tag HTML (<p>, <strong>, <em>, <ul>, <li>, ecc.). Traduci e riscrivi SOLO il testo all'interno dei tag, senza mai aggiungere, rimuovere o modificare i tag stessi. Non aggiungere markdown, note o testo fuori dai tag HTML.`
      : `Sei un assistente specializzato nella redazione di comunicati sindacali per la CISL (Confederazione Italiana Sindacati Lavoratori).

Il tuo compito è trasformare testi in comunicati sindacali professionali, mantenendo:
- Tono formale ma accessibile
- Struttura chiara con introduzione, sviluppo e conclusione
- Riferimenti ai valori sindacali (tutela dei lavoratori, diritti, sicurezza)
- Linguaggio appropriato per comunicazioni ufficiali

Riscrivi il testo fornito come un comunicato sindacale completo e professionale.`;

    const prompt = html
      ? `Riscrivi il seguente comunicato sindacale CISL in formato HTML, preservando tutti i tag:

${text}

HTML riscritto (solo HTML, nient'altro):`
      : `Riscrivi il seguente testo come un comunicato sindacale CISL:

"""${text}"""

Comunicato sindacale:`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Translate text to English.
   * If the input is HTML, the output must preserve the HTML tag structure.
   */
  async translateToEnglish(text: string): Promise<string> {
    const html = this.isHtml(text);

    const systemPrompt = html
      ? `Sei un traduttore professionale specializzato in traduzioni dall'italiano all'inglese per documenti sindacali.

Il testo ti viene fornito in formato HTML. Traduci il contenuto in inglese, mantenendo:
- Tono formale e professionale
- Terminologia sindacale appropriata

REGOLA FONDAMENTALE: Restituisci SOLO HTML valido. Preserva esattamente la struttura dei tag HTML (<p>, <strong>, <em>, <ul>, <li>, ecc.). Traduci SOLO il testo all'interno dei tag, senza mai aggiungere, rimuovere o modificare i tag stessi. Non aggiungere markdown, note o testo fuori dai tag HTML.`
      : `Sei un traduttore professionale specializzato in traduzioni dal italiano all'inglese per documenti sindacali.

Traduci mantenendo:
- Tono formale e professionale
- Terminologia sindacale appropriata
- Chiarezza e precisione
- Formato adatto a comunicati ufficiali

IMPORTANTE: Rispondi SOLO con la traduzione. Non aggiungere note, spiegazioni, commenti o alternative. Non usare frasi come "Ecco la traduzione" o "Traduzione:".`;

    const prompt = html
      ? `Traduci in inglese il seguente comunicato sindacale in formato HTML, preservando tutti i tag:

${text}

HTML tradotto (solo HTML, nient'altro):`
      : `Traduci il seguente comunicato sindacale in inglese:

"""${text}"""

Traduzione (solo il testo tradotto, nient'altro):`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Generate a vector embedding for the given text using OLLAMA_EMBED_MODEL.
   * Returns a float array (768 dimensions for nomic-embed-text).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.embedModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama embeddings error: ${error}`);
      }

      const data: OllamaEmbeddingResponse = await response.json();
      return data.embedding;
    } catch (error) {
      this.logger.error("Ollama embedding failed:", error.message);
      throw error;
    }
  }

  /**
   * Generate a chatbot response using OLLAMA_CHATBOT_MODEL.
   */
  async chatGenerate(prompt: string, system?: string): Promise<string> {
    return this.generate(prompt, system, this.chatbotModel);
  }

  /**
   * Stream a chatbot response token-by-token using OLLAMA_CHATBOT_MODEL.
   * Ollama's stream:true API sends newline-delimited JSON objects; each chunk
   * is yielded immediately so the HTTP connection stays alive through proxies
   * (Cloudflare, nginx) that enforce a hard response-time limit.
   */
  async *chatGenerateStream(
    prompt: string,
    system?: string,
  ): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.chatbotModel,
        prompt,
        system,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => String(response.status));
      throw new Error(`Ollama streaming error: ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as { response?: string; done?: boolean };
          if (obj.response) yield obj.response;
          if (obj.done) return;
        } catch {
          // ignore malformed line
        }
      }
    }
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration info (for debugging)
   */
  getConfig(): {
    baseUrl: string;
    model: string;
    isCloud: boolean;
    hasApiKey: boolean;
  } {
    return {
      baseUrl: this.baseUrl,
      model: this.model,
      isCloud: this.isCloud,
      hasApiKey: !!this.apiKey,
    };
  }
}
