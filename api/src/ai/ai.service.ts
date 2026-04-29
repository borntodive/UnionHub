import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ChatMessage,
  OpenAIChatResponse,
  OpenAIEmbeddingResponse,
  OpenAIError,
  AiConfig,
} from "./interfaces/openai-response.interface";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly chatModel: string;
  private readonly embedModel: string;

  // Optional app attribution for OpenRouter rankings
  private readonly appUrl?: string;
  private readonly appName?: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.apiKey = this.configService.get<string>("OPENROUTER_API_KEY") || "";
    this.model =
      this.configService.get<string>("OPENROUTER_MODEL") ||
      "google/gemma-3-27b-it:free";
    this.chatModel =
      this.configService.get<string>("OPENROUTER_CHAT_MODEL") || this.model;
    this.embedModel =
      this.configService.get<string>("OPENROUTER_EMBED_MODEL") ||
      "openai/text-embedding-3-small";

    // Optional: App attribution for OpenRouter leaderboards
    this.appUrl = this.configService.get<string>("OPENROUTER_APP_URL");
    this.appName = this.configService.get<string>("OPENROUTER_APP_NAME");

    // DEBUG: Log configuration at startup
    this.logger.log(`[AI] === CONFIGURATION ===`);
    this.logger.log(`[AI] Base URL: ${this.baseUrl}`);
    this.logger.log(
      `[AI] API Key: ${this.apiKey ? `sk-or-v1-***${this.apiKey.slice(-8)}` : "MISSING!"}`,
    );
    this.logger.log(`[AI] Model: ${this.model}`);
    this.logger.log(`[AI] Chat Model: ${this.chatModel}`);
    this.logger.log(`[AI] Embed Model: ${this.embedModel}`);
    this.logger.log(`[AI] ========================`);

    if (!this.apiKey) {
      this.logger.warn(
        "OPENROUTER_API_KEY not configured. AI features will not work.",
      );
    }
  }

  /**
   * Get headers for OpenRouter API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept-Encoding": "identity", // Request uncompressed response
      Authorization: `Bearer ${this.apiKey}`,
    };

    // Optional app attribution
    if (this.appUrl) {
      headers["HTTP-Referer"] = this.appUrl;
    }
    if (this.appName) {
      headers["X-OpenRouter-Title"] = this.appName;
    }

    return headers;
  }

  /**
   * Calculate timeout based on prompt length
   * Base: 120s, +60s for each 10K chars over 10K
   */
  private calculateTimeout(promptLength: number): number {
    const baseTimeout = 120000; // 120 seconds
    if (promptLength <= 10000) return baseTimeout;

    const extraChunks = Math.ceil((promptLength - 10000) / 10000);
    return baseTimeout + extraChunks * 60000;
  }

  /**
   * Check if the model is a Gemma model (doesn't support system messages)
   */
  private isGemmaModel(model: string): boolean {
    return model.toLowerCase().includes("gemma");
  }

  /**
   * Build messages array for chat completion
   * Handles Gemma models that don't support system messages
   */
  private buildMessages(
    userPrompt: string,
    systemPrompt?: string,
    conversationHistory?: ChatMessage[],
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const modelForChat = this.model; // Will use model param when calling

    if (this.isGemmaModel(modelForChat) && systemPrompt) {
      // Gemma: prepend system to user message
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      messages.push({ role: "user", content: combinedPrompt });
    } else {
      // Other models: use system message
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: userPrompt });
    }

    // Add conversation history if provided (skip for Gemma with system)
    if (conversationHistory && conversationHistory.length > 0) {
      const isGemma = this.isGemmaModel(modelForChat) && !!systemPrompt;
      if (!isGemma) {
        // Insert history before the final user message
        const lastUserMsg = messages.pop()!;
        messages.push(...conversationHistory);
        messages.push(lastUserMsg);
      }
    }

    return messages;
  }

  /**
   * Core chat completion method
   */
  private async chatCompletion(
    messages: ChatMessage[],
    model: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const body = {
      model,
      messages,
      stream: false,
    };

    // DEBUG: Log request details
    this.logger.log(`[AI] === OPENROUTER REQUEST ===`);
    this.logger.log(`[AI] URL: ${this.baseUrl}/chat/completions`);
    this.logger.log(`[AI] Model: ${model}`);
    this.logger.log(`[AI] Messages: ${JSON.stringify(messages, null, 2)}`);
    this.logger.log(
      `[AI] Headers: ${JSON.stringify(
        {
          ...this.getHeaders(),
          Authorization: this.getHeaders().Authorization.replace(
            /sk-or-v1-[^.]+/,
            "sk-or-v1-***",
          ),
        },
        null,
        2,
      )}`,
    );
    this.logger.log(`[AI] Body: ${JSON.stringify(body, null, 2)}`);
    this.logger.log(`[AI] ============================`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal,
    });

    // DEBUG: Log response details
    this.logger.log(`[AI] === OPENROUTER RESPONSE ===`);
    this.logger.log(`[AI] Status: ${response.status} ${response.statusText}`);
    this.logger.log(
      `[AI] Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`,
    );

    let responseText: string;
    try {
      // Use arrayBuffer() with timeout - more reliable than manual stream reading
      const bufferPromise = response.arrayBuffer();
      const bodyTimeoutMs = 120000; // 120 seconds for large responses

      const timeoutPromise = new Promise<ArrayBuffer>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Body read timeout (${bodyTimeoutMs}ms)`)),
          bodyTimeoutMs,
        ),
      );

      const buffer = await Promise.race([bufferPromise, timeoutPromise]);
      responseText = new TextDecoder().decode(buffer);

      this.logger.log(
        `[AI] Body (${responseText.length} chars): ${responseText.substring(0, 2000)}${responseText.length > 2000 ? "..." : ""}`,
      );
    } catch (err) {
      this.logger.error(`[AI] Error reading response body: ${err}`);
      throw new Error(`Failed to read OpenRouter response: ${err}`);
    }
    this.logger.log(`[AI] =============================`);

    if (!response.ok) {
      const errorData: OpenAIError = JSON.parse(responseText);
      throw new Error(
        `OpenRouter API error: ${errorData.error.message} (${response.status})`,
      );
    }

    const data: OpenAIChatResponse = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content || "";

    this.logger.debug(
      `[AI] Chat completion success, response length: ${content.length}`,
    );

    return content;
  }

  /**
   * Generate a response from the AI.
   * Main method for simple prompt/response interactions.
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const messages = this.buildMessages(prompt, systemPrompt);
    const timeout = this.calculateTimeout(prompt.length);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await this.chatCompletion(messages, this.model, controller.signal);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`AI request timeout (${timeout / 1000}s)`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Chat with conversation history support.
   * Uses the dedicated chat model for faster responses.
   */
  async chat(
    userMessage: string,
    systemPrompt?: string,
    conversationHistory?: ChatMessage[],
  ): Promise<string> {
    const messages = this.buildMessages(
      userMessage,
      systemPrompt,
      conversationHistory,
    );
    const timeout = this.calculateTimeout(userMessage.length);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      return await this.chatCompletion(
        messages,
        this.chatModel,
        controller.signal,
      );
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`AI request timeout (${timeout / 1000}s)`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Strip inline styles from HTML to reduce token usage
   * Removes style="..." attributes and <style> tags
   * The PDF template has its own CSS, so these are redundant
   */
  private stripInlineStyles(html: string): string {
    // Remove <style>...</style> tags (including multiline)
    let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Remove style="..." attributes from all tags
    // This handles both quoted styles (single/double) and edge cases
    cleaned = cleaned.replace(
      /\s+style\s*=\s*(["'])(?:(?=(\\?))\2.)*?\1/gi,
      "",
    );

    // Remove class attributes that might be editor-specific (optional, saves more tokens)
    cleaned = cleaned.replace(/\s+class\s*=\s*"[^"]*"/gi, "");
    cleaned = cleaned.replace(/\s+class\s*=\s*'[^']*'/gi, "");

    // Clean up multiple spaces that might result from removal
    cleaned = cleaned.replace(/\s+/g, " ");

    return cleaned;
  }

  /**
   * Translate text from Italian to English.
   * Preserves HTML tag structure when input is HTML.
   */
  async translateToEnglish(text: string): Promise<string> {
    this.logger.debug(`[AI] Translating text, length: ${text.length}`);

    const isHtml = text.trim().startsWith("<");

    // Strip inline styles to save tokens (they're redundant with PDF template CSS)
    const textToProcess = isHtml ? this.stripInlineStyles(text) : text;

    const systemPrompt = isHtml
      ? `You are a professional translator. Translate the following text from Italian to English.
CRITICAL RULES:
- Preserve ALL HTML tags exactly as they are (do not translate, modify, or remove any HTML tags, attributes, or structure)
- Only translate the visible text content between tags
- Do not add any explanation, just return the translated HTML
- Maintain the exact same HTML structure`
      : `You are a professional translator. Translate the following text from Italian to English.
CRITICAL: Output ONLY the English translation. No explanations, no "here is the translation".`;

    const messages = this.buildMessages(textToProcess, systemPrompt);
    const timeout = this.calculateTimeout(textToProcess.length);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const translation = await this.chatCompletion(
        messages,
        this.model,
        controller.signal,
      );
      this.logger.debug(
        `[AI] Translation complete, length: ${translation.length}`,
      );
      return translation;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Translation timeout (${timeout / 1000}s)`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Rewrite text as a union communication.
   * Preserves HTML structure when input is HTML.
   */
  async rewriteAsUnionCommunication(text: string): Promise<string> {
    this.logger.debug(`[AI] Rewriting as union communication`);

    const isHtml = text.trim().startsWith("<");

    // Strip inline styles to save tokens (they're redundant with PDF template CSS)
    const textToProcess = isHtml ? this.stripInlineStyles(text) : text;

    const systemPrompt = isHtml
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

    const userPrompt = isHtml
      ? `Riscrivi il seguente comunicato sindacale CISL in formato HTML, preservando tutti i tag:\n\n${textToProcess}\n\nHTML riscritto (solo HTML, nient'altro):`
      : `Riscrivi il seguente testo come un comunicato sindacale CISL:\n\n"""${textToProcess}"""\n\nComunicato sindacale:`;

    return this.generate(userPrompt, systemPrompt);
  }

  /**
   * Generate vector embedding for the given text.
   * Uses OpenRouter embeddings endpoint with OpenAI-compatible models.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    this.logger.log(`[AI] === EMBEDDINGS REQUEST ===`);
    this.logger.log(`[AI] URL: ${this.baseUrl}/embeddings`);
    this.logger.log(`[AI] Model: ${this.embedModel}`);
    this.logger.log(`[AI] Text length: ${text.length}`);
    this.logger.log(
      `[AI] Headers: ${JSON.stringify(
        {
          ...this.getHeaders(),
          Authorization: this.getHeaders().Authorization.replace(
            /sk-or-v1-[^.]+/,
            "sk-or-v1-***",
          ),
        },
        null,
        2,
      )}`,
    );
    this.logger.log(`[AI] ============================`);

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.embedModel,
        input: text,
      }),
    });

    this.logger.log(`[AI] === EMBEDDINGS RESPONSE ===`);
    this.logger.log(`[AI] Status: ${response.status} ${response.statusText}`);

    // Use arrayBuffer() with timeout
    const bufferPromise = response.arrayBuffer();
    const bodyTimeoutMs = 30000; // 30 seconds for embeddings

    const timeoutPromise = new Promise<ArrayBuffer>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Embeddings body read timeout (${bodyTimeoutMs}ms)`),
          ),
        bodyTimeoutMs,
      ),
    );

    const buffer = await Promise.race([bufferPromise, timeoutPromise]);
    const responseText = new TextDecoder().decode(buffer);

    this.logger.log(`[AI] Body: ${responseText}`);
    this.logger.log(`[AI] =============================`);

    if (!response.ok) {
      const errorData: OpenAIError = JSON.parse(responseText);
      throw new Error(
        `OpenRouter embeddings error: ${errorData.error.message} (${response.status})`,
      );
    }

    const data: OpenAIEmbeddingResponse = JSON.parse(responseText);
    const embedding = data.data?.[0]?.embedding || [];

    this.logger.log(
      `[AI] Embedding generated, dimensions: ${embedding.length}`,
    );

    return embedding;
  }

  /**
   * Check if OpenRouter is accessible
   */
  async healthCheck(): Promise<boolean> {
    this.logger.debug("[AI] Health check starting");

    try {
      // Simple test with minimal prompt
      const response = await this.generate("OK", "Respond with only: OK");
      const isHealthy = response.toLowerCase().includes("ok");

      this.logger.debug(`[AI] Health check result: ${isHealthy}`);
      return isHealthy;
    } catch (error) {
      this.logger.error(`[AI] Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get service configuration for debugging
   */
  getConfig(): AiConfig {
    return {
      baseUrl: this.baseUrl,
      model: this.model,
      chatModel: this.chatModel,
      embedModel: this.embedModel,
      hasApiKey: !!this.apiKey,
      isCloud: true, // Always using OpenRouter (cloud)
    };
  }
}
