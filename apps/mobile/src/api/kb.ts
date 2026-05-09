import apiClient from "./client";

export interface Citation {
  document_title: string;
  section: string;
}

export interface KbAskResponse {
  answer: string;
  citations: Citation[];
}

export interface KbDocument {
  id: number;
  title: string;
  section_count: number;
}

export interface KbStatus {
  status: string;
  kb_documents: number;
}

export interface IngestDocumentResult {
  filename: string;
  status: string;
  title?: string;
  document_id?: number;
  sections?: number;
  reason?: string;
}

export interface IngestResponse {
  total: number;
  ingested: number;
  skipped: number;
  failed: number;
  documents: IngestDocumentResult[];
}

export interface KbChatRequestSummary {
  id: string;
  question: string;
  createdAt: string;
  user: {
    id: string;
    crewcode: string;
    nome: string;
    cognome: string;
  } | null;
}

export interface KbChatRequest extends KbChatRequestSummary {
  answer: string;
  citations: Citation[];
}

export const kbApi = {
  ask: async (question: string): Promise<KbAskResponse> => {
    const response = await apiClient.post<KbAskResponse>("/ai/kb/ask", {
      question,
    });
    return response.data;
  },

  listRequests: async (): Promise<KbChatRequestSummary[]> => {
    const response =
      await apiClient.get<KbChatRequestSummary[]>("/ai/kb/requests");
    return response.data;
  },

  getRequest: async (id: string): Promise<KbChatRequest> => {
    const response = await apiClient.get<KbChatRequest>(
      `/ai/kb/requests/${id}`,
    );
    return response.data;
  },

  listDocuments: async (): Promise<KbDocument[]> => {
    const response = await apiClient.get<KbDocument[]>("/ai/kb/documents");
    return response.data;
  },

  getStatus: async (): Promise<KbStatus> => {
    const response = await apiClient.get<KbStatus>("/ai/kb/status");
    return response.data;
  },

  ingest: async (force = false): Promise<IngestResponse> => {
    const response = await apiClient.post<IngestResponse>(
      "/ai/kb/ingest",
      { force },
      { timeout: 300_000 },
    );
    return response.data;
  },

  uploadFiles: async (
    files: { uri: string; name: string; mimeType?: string }[],
  ): Promise<{ uploaded: { filename: string; size: number }[] }> => {
    const form = new FormData();
    for (const f of files) {
      const type =
        f.mimeType ??
        (f.name.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "text/markdown");
      form.append("files", { uri: f.uri, name: f.name, type } as any);
    }
    const response = await apiClient.post<{
      uploaded: { filename: string; size: number }[];
    }>("/ai/kb/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
