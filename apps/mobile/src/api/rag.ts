import apiClient from "./client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  question: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  sources: string[];
}

export interface RagStatus {
  lastReindexAt: string | null;
  totalChunks: number;
}

export interface RagDocument {
  name: string;
  files: string[];
}

export interface RagDocumentsResponse {
  categories: RagDocument[];
}

export interface RagReindexResponse {
  started: true;
}

export type ReindexPhase =
  | "idle"
  | "discovering"
  | "loading"
  | "splitting"
  | "embedding"
  | "inserting"
  | "done"
  | "error";

export interface ReindexProgress {
  isRunning: boolean;
  phase: ReindexPhase;
  current: number;
  total: number;
  message: string;
  percent: number;
  estimatedTimeRemaining: number; // in seconds
}

export const ragApi = {
  chat: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>("/rag/chat", data);
    return response.data;
  },

  getStatus: async (): Promise<RagStatus> => {
    const response = await apiClient.get<RagStatus>("/rag/status");
    return response.data;
  },

  getDocuments: async (): Promise<RagDocumentsResponse> => {
    const response =
      await apiClient.get<RagDocumentsResponse>("/rag/documents");
    return response.data;
  },

  reindex: async (): Promise<RagReindexResponse> => {
    const response = await apiClient.post<RagReindexResponse>("/rag/reindex");
    return response.data;
  },

  getProgress: async (): Promise<ReindexProgress> => {
    const response = await apiClient.get<ReindexProgress>("/rag/progress");
    return response.data;
  },
};
