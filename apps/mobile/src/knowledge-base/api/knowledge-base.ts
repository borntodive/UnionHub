import apiClient from "../../api/client";

export type KbStatus = "pending" | "indexing" | "ready" | "error";

export interface KbDocument {
  id: string;
  title: string;
  filename: string;
  accessLevel: "all" | "admin";
  ruolo: string | null;
  chunkCount: number;
  status: KbStatus;
  createdAt: string;
}

export const knowledgeBaseApi = {
  list: () => apiClient.get<KbDocument[]>("/knowledge-base"),

  upload: (
    fileUri: string,
    filename: string,
    title: string,
    accessLevel: "all" | "admin",
    ruolo?: "pilot" | "cabin_crew",
  ) => {
    const form = new FormData();
    form.append("file", {
      uri: fileUri,
      name: filename,
      type: "application/pdf",
    } as any);
    form.append("title", title);
    form.append("accessLevel", accessLevel);
    if (ruolo) form.append("ruolo", ruolo);
    // No custom timeout — server returns 202 immediately now
    return apiClient.post<KbDocument>("/knowledge-base/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  delete: (id: string) => apiClient.delete(`/knowledge-base/${id}`),

  reindex: (id: string) => apiClient.post(`/knowledge-base/${id}/reindex`),
};
