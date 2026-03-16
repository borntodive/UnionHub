import apiClient from './client';

export type DocumentStatus = 'draft' | 'reviewing' | 'approved' | 'published';

export interface Document {
  id: string;
  title: string;
  originalContent: string;
  aiReviewedContent: string | null;
  englishTranslation: string | null;
  finalPdfUrl: string | null;
  status: DocumentStatus;
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

  publishDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.post(`/documents/${id}/publish`);
    return response.data;
  },

  downloadPdf: async (id: string, title: string): Promise<void> => {
    const response = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
