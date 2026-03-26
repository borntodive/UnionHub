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
  author?: { id: string; nome: string; cognome: string; crewcode: string };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CreateDocumentData {
  title: string;
  content: string;
  union?: UnionType;
  ruolo?: DocumentRuolo;
}

export const documentsApi = {
  /** Admin+: all documents regardless of status */
  getDocuments: async (): Promise<Document[]> => {
    const res = await apiClient.get<Document[]>("/documents");
    return res.data;
  },

  /** Any authenticated user: published documents only */
  getPublishedDocuments: async (): Promise<Document[]> => {
    const res = await apiClient.get<Document[]>("/documents/public/published");
    return res.data;
  },

  getDocument: async (id: string): Promise<Document> => {
    const res = await apiClient.get<Document>(`/documents/${id}`);
    return res.data;
  },

  createDocument: async (data: CreateDocumentData): Promise<Document> => {
    const res = await apiClient.post<Document>("/documents", data);
    return res.data;
  },

  /**
   * Returns a blob URL suitable for <iframe src="...">.
   * Caller MUST call URL.revokeObjectURL() on cleanup.
   */
  getPdfBlobUrl: async (id: string, isAdmin: boolean): Promise<string> => {
    const path = isAdmin
      ? `/documents/${id}/download`
      : `/documents/public/${id}/download`;
    const res = await apiClient.get(path, { responseType: "blob" });
    return URL.createObjectURL(res.data as Blob);
  },

  /** Triggers a browser download of the PDF */
  downloadPdf: async (
    id: string,
    title: string,
    isAdmin: boolean,
  ): Promise<void> => {
    const path = isAdmin
      ? `/documents/${id}/download`
      : `/documents/public/${id}/download`;
    const res = await apiClient.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
