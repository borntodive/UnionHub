import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    this.model = this.configService.get<string>('OLLAMA_MODEL') || 'llama3.2';
  }

  /**
   * Generate a response from Ollama
   */
  async generate(prompt: string, system?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
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
      this.logger.error('Ollama generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Rewrite text as a union communication
   */
  async rewriteAsUnionCommunication(text: string): Promise<string> {
    const systemPrompt = `Sei un assistente specializzato nella redazione di comunicati sindacali per la CISL (Confederazione Italiana Sindacati Lavoratori).

Il tuo compito è trasformare testi in comunicati sindacali professionali, mantenendo:
- Tono formale ma accessibile
- Struttura chiara con introduzione, sviluppo e conclusione
- Riferimenti ai valori sindacali (tutela dei lavoratori, diritti, sicurezza)
- Linguaggio appropriato per comunicazioni ufficiali

Riscrivi il testo fornito come un comunicato sindacale completo e professionale.`;

    const prompt = `Riscrivi il seguente testo come un comunicato sindacale CISL:

"""${text}"""

Comunicato sindacale:`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Translate text to English
   */
  async translateToEnglish(text: string): Promise<string> {
    const systemPrompt = `Sei un traduttore professionale specializzato in traduzioni dal italiano all'inglese per documenti sindacali.

Traduci mantenendo:
- Tono formale e professionale
- Terminologia sindacale appropriata
- Chiarezza e precisione
- Formato adatto a comunicati ufficiali`;

    const prompt = `Traduci il seguente comunicato sindacale in inglese:

"""${text}"""

Traduzione in inglese:`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Check if Ollama is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
