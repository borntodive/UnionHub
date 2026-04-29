export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: number;
  };
}

export interface AiConfig {
  baseUrl: string;
  model: string;
  chatModel: string;
  embedModel: string;
  hasApiKey: boolean;
  isCloud: boolean;
}
