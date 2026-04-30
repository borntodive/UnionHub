import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OpenAI } from "openai";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly translationModel: string;
  private readonly isCloud: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("OPENROUTER_API_KEY");
    if (!apiKey) {
      this.logger.warn(
        "OPENROUTER_API_KEY not configured - AI features will be disabled",
      );
    }

    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey || "dummy-key",
    });

    this.model =
      this.configService.get<string>("OPENROUTER_MODEL") ||
      "google/gemma-3-27b-it:free";
    this.translationModel =
      this.configService.get<string>("OPENROUTER_TRANSLATION_MODEL") ||
      this.model;
    this.isCloud = this.configService.get<boolean>("OPENROUTER_CLOUD") || false;
  }

  getConfig(): {
    model: string;
    translationModel: string;
    isCloud: boolean;
  } {
    return {
      model: this.model,
      translationModel: this.translationModel,
      isCloud: this.isCloud,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>("OPENROUTER_API_KEY");
      if (!apiKey) {
        return false;
      }

      // Use translationModel for health check since that's what we use for translations
      await this.openai.chat.completions.create({
        model: this.translationModel,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1,
      });

      return true;
    } catch (error) {
      this.logger.error(`AI health check failed: ${error.message}`);
      return false;
    }
  }

  async rewriteAsUnionCommunication(content: string): Promise<string> {
    // Combine system prompt into user message for Gemma compatibility
    // (Gemma doesn't support system role via OpenAI API)
    const combinedPrompt = `You are an expert union communication writer for CISL aviation union.
Your task is to rewrite the given text as a professional union communication.

Guidelines:
- Maintain a formal but approachable tone
- Emphasize member rights and protections
- Use clear and direct language
- Preserve all important details
- Do not add information not present in the original text
- Write in Italian

Rewrite the following text as a union communication:

${content}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.translationModel,
        messages: [{ role: "user", content: combinedPrompt }],
        max_tokens: 4000,
      });

      return response.choices[0]?.message?.content || content;
    } catch (error: any) {
      this.logger.error(
        `[REWRITE] OpenRouter API error: ${JSON.stringify({
          status: error?.status,
          message: error?.message,
          error: error?.error,
          type: error?.type,
          code: error?.code,
        })}`,
      );
      throw error;
    }
  }

  async translateToEnglish(content: string): Promise<string> {
    // Combine system prompt into user message for Gemma compatibility
    // (Gemma doesn't support system role via OpenAI API)
    const combinedPrompt = `You are a professional translator specializing in aviation and union communications.
Translate the following Italian text to English while maintaining:
- Professional tone
- Aviation terminology accuracy
- Union context and meaning

Translate ONLY the text below, do not add any explanations or notes:

${content}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.translationModel,
        messages: [{ role: "user", content: combinedPrompt }],
        max_tokens: 4000,
      });

      return response.choices[0]?.message?.content || content;
    } catch (error: any) {
      this.logger.error(
        `[TRANSLATE] OpenRouter API error: ${JSON.stringify({
          status: error?.status,
          message: error?.message,
          error: error?.error,
          type: error?.type,
          code: error?.code,
        })}`,
      );
      throw error;
    }
  }

  async generate(prompt: string, systemPrompt: string): Promise<string> {
    // Combine system prompt into user message for Gemma compatibility
    // (Gemma doesn't support system role via OpenAI API)
    const combinedPrompt = `${systemPrompt}

${prompt}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.translationModel,
        messages: [{ role: "user", content: combinedPrompt }],
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || "";
    } catch (error: any) {
      this.logger.error(
        `[GENERATE] OpenRouter API error: ${JSON.stringify({
          status: error?.status,
          message: error?.message,
          error: error?.error,
          type: error?.type,
          code: error?.code,
        })}`,
      );
      throw error;
    }
  }
}
