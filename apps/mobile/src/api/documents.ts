import apiClient from "./client";

export type DocumentStatus =
  | "draft"
  | "reviewing"
  | "approved"
  | "verified"
  | "published"
  | "rejected";
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

export interface ReviewDocumentRequest {
  content: string;
}

export interface ApproveDocumentRequest {
  reviewedContent?: string;
}

export interface OllamaHealth {
  available: boolean;
  model: string;
  isCloud: boolean;
}

export const documentsApi = {
  getOllamaHealth: async (): Promise<OllamaHealth> => {
    const response = await apiClient.get("/documents/health/ollama");
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

  reviewDocument: async (
    id: string,
    data: ReviewDocumentRequest,
  ): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/review`, data);
    return response.data;
  },

  approveDocument: async (
    id: string,
    data: ApproveDocumentRequest,
  ): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/approve`, data);
    return response.data;
  },

  verifyDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/verify`);
    return response.data;
  },

  publishDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/publish`);
    return response.data;
  },

  regeneratePdf: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/regenerate`);
    return response.data;
  },

  regenerateTranslations: async (id: string): Promise<Document> => {
    const response = await apiClient.post(
      `/documents/${id}/regenerate-translations`,
    );
    return response.data;
  },

  getPdfBase64: async (id: string): Promise<string | null> => {
    // Use the public download endpoint that doesn't require admin role
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
  },

  updateTranslation: async (
    id: string,
    englishTranslation: string,
  ): Promise<Document> => {
    const response = await apiClient.patch(`/documents/${id}/translation`, {
      englishTranslation,
    });
    return response.data;
  },

  rejectDocument: async (
    id: string,
    rejectionReason?: string,
  ): Promise<Document> => {
    const response = await apiClient.patch(`/documents/${id}/reject`, {
      rejectionReason,
    });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  uploadDocument: async (data: {
    fileUri: string;
    fileName: string;
    title: string;
    union?: UnionType;
    ruolo?: DocumentRuolo;
  }): Promise<Document> => {
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
};
