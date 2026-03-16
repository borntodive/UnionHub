import apiClient from './client';

export type DocumentStatus = 'draft' | 'reviewing' | 'approved' | 'verified' | 'published';
export type UnionType = 'fit-cisl' | 'joint';
export type DocumentRuolo = 'pilot' | 'cabin_crew';

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
    const response = await apiClient.get('/documents/health/ollama');
    return response.data;
  },

  getDocuments: async (): Promise<Document[]> => {
    const response = await apiClient.get('/documents');
    return response.data;
  },

  getDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  createDocument: async (data: CreateDocumentRequest): Promise<Document> => {
    const response = await apiClient.post('/documents', data);
    return response.data;
  },

  reviewDocument: async (id: string, data: ReviewDocumentRequest): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/review`, data);
    return response.data;
  },

  approveDocument: async (id: string, data: ApproveDocumentRequest): Promise<Document> => {
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
    const response = await apiClient.post(`/documents/${id}/regenerate-translations`);
    return response.data;
  },

  getPdfBase64: async (id: string): Promise<string | null> => {
    const response = await apiClient.get(`/documents/${id}`);
    const document = response.data as Document;
    
    // Extract base64 from data URL
    if (document.finalPdfUrl?.startsWith('data:application/pdf;base64,')) {
      return document.finalPdfUrl.replace('data:application/pdf;base64,', '');
    }
    return null;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
