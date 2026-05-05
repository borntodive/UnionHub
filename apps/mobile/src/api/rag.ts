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
  totalPages?: number;
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

// Wiki-related types and API
export type WikiCategory =
  | "entities"
  | "concepts"
  | "sources"
  | "comparisons"
  | "queries";

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  path: string;
  category: WikiCategory;
  tags: string[];
  sourceDocument?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface WikiIndex {
  pages: Array<{
    title: string;
    slug: string;
    category: WikiCategory;
    path: string;
    tags: string[];
  }>;
  lastUpdated: string;
}

export interface WikiIngestResponse {
  pagesCreated: number;
  pagesUpdated: number;
}

export type IngestPhase =
  | "idle"
  | "discovering"
  | "parsing"
  | "embedding"
  | "saving"
  | "done"
  | "error";

export interface WikiProgress {
  isRunning: boolean;
  phase: IngestPhase;
  current: number;
  total: number;
  message: string;
  percent: number;
}

export interface LintIssue {
  type: "orphan" | "broken-link" | "missing-tags" | "duplicate";
  severity: "error" | "warning";
  message: string;
  path?: string;
}

export const wikiApi = {
  ingest: async (): Promise<WikiIngestResponse> => {
    const response = await apiClient.post<WikiIngestResponse>("/wiki/ingest");
    return response.data;
  },

  getIndex: async (): Promise<WikiIndex> => {
    const response = await apiClient.get<WikiIndex>("/wiki/index");
    return response.data;
  },

  getPage: async (slug: string): Promise<WikiPage> => {
    const response = await apiClient.get<WikiPage>(
      `/wiki/page/${encodeURIComponent(slug)}`,
    );
    return response.data;
  },

  getLog: async (): Promise<{ content: string }> => {
    const response = await apiClient.get<{ content: string }>("/wiki/log");
    return response.data;
  },

  lint: async (): Promise<LintIssue[]> => {
    const response = await apiClient.post<LintIssue[]>("/wiki/lint");
    return response.data;
  },

  getProgress: async (): Promise<WikiProgress> => {
    const response = await apiClient.get<WikiProgress>("/wiki/progress");
    return response.data;
  },
};
