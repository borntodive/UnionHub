import apiClient from "./client";

export type DocumentStatus = "draft" | "published";
export type UnionType = "fit-cisl" | "joint";
export type DocumentRuolo = "pilot" | "cabin_crew";

export interface Document {
  id: string;
  title: string;
  originalContent: string;
  aiReviewedContent: string | null;
  englishTranslation: string | null;
  englishTitle: string | null;
  finalPdfUrl: string | null;
  status: DocumentStatus;
  union: UnionType;
  ruolo: DocumentRuolo;
  createdBy: string;
  author?: {
    id: string;
    nome: string;
    cognome: string;
    crewcode: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
  union?: UnionType;
  ruolo?: DocumentRuolo;
}

export interface UploadDocumentRequest {
  fileUri: string;
  fileName: string;
  title: string;
  union?: UnionType;
  ruolo?: DocumentRuolo;
}

export interface AiHealth {
  available: boolean;
  model: string;
  isCloud: boolean;
}

export const documentsApi = {
  getAiHealth: async (): Promise<AiHealth> => {
    const response = await apiClient.get("/documents/health/ai");
    return response.data;
  },

  getDocuments: async (): Promise<Document[]> => {
    const response = await apiClient.get("/documents");
    return response.data;
  },

  getDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  createDocument: async (data: CreateDocumentRequest): Promise<Document> => {
    const response = await apiClient.post("/documents", data);
    return response.data;
  },

  updateDocument: async (
    id: string,
    data: { title?: string; content?: string },
  ): Promise<Document> => {
    const response = await apiClient.patch(`/documents/${id}`, data);
    return response.data;
  },

  uploadDocument: async (data: UploadDocumentRequest): Promise<Document> => {
    const formData = new FormData();
    formData.append("file", {
      uri: data.fileUri,
      name: data.fileName,
      type: "application/pdf",
    } as any);
    formData.append("title", data.title);
    if (data.union) formData.append("union", data.union);
    if (data.ruolo) formData.append("ruolo", data.ruolo);

    const response = await apiClient.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  processDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/process`);
    return response.data;
  },

  publishDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/publish`);
    return response.data;
  },

  updateTranslation: async (
    id: string,
    englishTranslation: string,
    englishTitle?: string,
  ): Promise<Document> => {
    const response = await apiClient.patch(`/documents/${id}/translation`, {
      englishTranslation,
      englishTitle,
    });
    return response.data;
  },

  regeneratePdf: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/regenerate-pdf`);
    return response.data;
  },

  regenerateAi: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/regenerate-ai`);
    return response.data;
  },

  translateDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/translate`);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  getPdfBase64: async (id: string): Promise<string | null> => {
    try {
      // Try public endpoint first (for published documents)
      const response = await apiClient.get(`/documents/public/${id}/download`, {
        responseType: "arraybuffer",
      });

      // Convert array buffer to base64 (React Native compatible)
      const arrayBuffer = response.data as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error: any) {
      // If public endpoint fails (404 for unpublished), try private endpoint
      if (error.response?.status === 404) {
        const response = await apiClient.get(`/documents/${id}/download`, {
          responseType: "arraybuffer",
        });

        const arrayBuffer = response.data as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }
      throw error;
    }
  },

  getPublishedDocuments: async (): Promise<Document[]> => {
    const response = await apiClient.get("/documents/public/published");
    return response.data;
  },
};
