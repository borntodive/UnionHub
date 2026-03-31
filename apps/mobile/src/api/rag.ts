import apiClient from "./client";

export const RAG_QUERY_KEYS = {
  documents: ["rag", "documents"] as const,
  health: ["rag", "health"] as const,
  document: (id: string) => ["rag", "document", id] as const,
  job: (jobId: string) => ["rag", "job", jobId] as const,
};

export type RetrievalMode = "lexical" | "semantic" | "hybrid";

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionCode: string | null;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  quote: string;
}

export interface AskResponse {
  answer: string;
  rewrittenQuestion: string;
  citations: Citation[];
  retrievalMode: string;
}

export interface AskRequest {
  question: string;
  documentIds?: string[];
  retrievalMode?: RetrievalMode;
  topK?: number;
}

export interface RagHealthStatus {
  redis: boolean;
  pythonService: boolean;
  pgvector: boolean;
  ollama: boolean;
  overall: boolean;
}

// Admin types

export interface RagDocument {
  id: string;
  code: string;
  title: string;
  manualPart: string | null;
  issue: string | null;
  revision: string | null;
  revisionDate: string | null;
  sourceFileName: string;
  sha256: string;
  isActive: boolean;
  createdAt: string;
  ingestionJobs?: IngestionJob[];
}

export interface IngestionStep {
  id: string;
  stepName: string;
  status: IngestionStatus;
  errorMessage: string | null;
  payload?: Record<string, any> | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
  createdAt: string;
}

export type IngestionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "RETRYING";

export interface IngestionJob {
  id: string;
  documentId: string;
  status: IngestionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  steps?: IngestionStep[];
}

export interface UploadDocumentDto {
  code: string;
  title: string;
  manualPart?: string;
  issue?: string;
  revision?: string;
}

export const ragApi = {
  // ── User endpoints ──────────────────────────────────────────────────────────

  ask: async (req: AskRequest): Promise<AskResponse> => {
    const response = await apiClient.post<AskResponse>("/rag/ask", req, {
      timeout: 120000,
    });
    return response.data;
  },

  health: async (): Promise<RagHealthStatus> => {
    const response = await apiClient.get<RagHealthStatus>("/health/rag");
    return response.data;
  },

  // ── Admin — Documents ────────────────────────────────────────────────────────

  listDocuments: async (): Promise<RagDocument[]> => {
    const response = await apiClient.get<RagDocument[]>("/rag/documents");
    return response.data;
  },

  getDocument: async (id: string): Promise<RagDocument> => {
    const response = await apiClient.get<RagDocument>(`/rag/documents/${id}`);
    return response.data;
  },

  uploadDocument: async (
    fileUri: string,
    fileName: string,
    dto: UploadDocumentDto,
  ): Promise<RagDocument> => {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: "application/pdf",
    } as any);
    formData.append("code", dto.code);
    formData.append("title", dto.title);
    if (dto.manualPart) formData.append("manualPart", dto.manualPart);
    if (dto.issue) formData.append("issue", dto.issue);
    if (dto.revision) formData.append("revision", dto.revision);

    const response = await apiClient.post<RagDocument>(
      "/rag/documents/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  // ── Admin — Ingestion ────────────────────────────────────────────────────────

  startIngestion: async (documentId: string): Promise<IngestionJob> => {
    const response = await apiClient.post<IngestionJob>(
      "/rag/ingestion/start",
      {
        documentId,
      },
    );
    return response.data;
  },

  getJobStatus: async (jobId: string): Promise<IngestionJob> => {
    const response = await apiClient.get<IngestionJob>(
      `/rag/ingestion/${jobId}`,
    );
    return response.data;
  },

  retryIngestion: async (jobId: string): Promise<IngestionJob> => {
    const response = await apiClient.post<IngestionJob>(
      `/rag/ingestion/${jobId}/retry`,
    );
    return response.data;
  },

  deleteDocument: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/rag/documents/${id}`);
    return response.data;
  },
};
