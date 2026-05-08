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

export const kbApi = {
  ask: async (question: string): Promise<KbAskResponse> => {
    const response = await apiClient.post<KbAskResponse>("/ai/kb/ask", {
      question,
    });
    return response.data;
  },

  listDocuments: async (): Promise<KbDocument[]> => {
    const response = await apiClient.get<{ documents: KbDocument[] }>(
      "/ai/kb/documents",
    );
    return response.data.documents;
  },

  getStatus: async (): Promise<KbStatus> => {
    const response = await apiClient.get<KbStatus>("/ai/kb/status");
    return response.data;
  },
};
