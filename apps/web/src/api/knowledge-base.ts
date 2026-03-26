import apiClient from "./client";
import type { Ruolo } from "@unionhub/shared/types";

export type KbDocumentStatus = "pending" | "indexing" | "ready" | "error";
export type KbAccessLevel = "all" | "admin";

export interface KbDocument {
  id: string;
  title: string;
  filename: string;
  accessLevel: KbAccessLevel;
  ruolo: Ruolo | null;
  chunkCount: number;
  status: KbDocumentStatus;
  createdAt: string;
}

export const knowledgeBaseApi = {
  getDocuments: async (): Promise<KbDocument[]> => {
    const res = await apiClient.get<KbDocument[]>("/knowledge-base");
    return res.data;
  },

  uploadDocument: async (
    file: File,
    title: string,
    accessLevel: KbAccessLevel,
    ruolo: Ruolo | null,
  ): Promise<KbDocument> => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("accessLevel", accessLevel);
    if (ruolo) form.append("ruolo", ruolo);
    const res = await apiClient.post<KbDocument>(
      "/knowledge-base/upload",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/knowledge-base/${id}`);
  },

  reindexDocument: async (id: string): Promise<void> => {
    await apiClient.post(`/knowledge-base/${id}/reindex`);
  },
};
