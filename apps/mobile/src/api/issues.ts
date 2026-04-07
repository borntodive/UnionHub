import apiClient from "./client";
import { Issue, IssueAttachment, IssueStatus } from "../types";

export interface CreateIssueData {
  title: string;
  description: string;
  categoryId: string;
  urgencyId: string;
}

export interface UpdateIssueData {
  status?: IssueStatus;
  adminNotes?: string;
}

export const issuesApi = {
  getMyIssues: async (): Promise<Issue[]> => {
    const response = await apiClient.get<Issue[]>("/issues/my");
    return response.data;
  },

  getIssues: async (): Promise<Issue[]> => {
    const response = await apiClient.get<Issue[]>("/issues");
    return response.data;
  },

  getById: async (id: string): Promise<Issue> => {
    const response = await apiClient.get<Issue>(`/issues/${id}`);
    return response.data;
  },

  createIssue: async (data: CreateIssueData): Promise<Issue> => {
    const response = await apiClient.post<Issue>("/issues", data);
    return response.data;
  },

  updateIssue: async (id: string, data: UpdateIssueData): Promise<Issue> => {
    const response = await apiClient.patch<Issue>(`/issues/${id}`, data);
    return response.data;
  },

  deleteIssue: async (id: string): Promise<void> => {
    await apiClient.delete(`/issues/${id}`);
  },

  getSummary: async (): Promise<{ summary: string; pdfBase64: string }> => {
    const response = await apiClient.post<{ summary: string; pdfBase64: string }>(
      "/issues/summary",
    );
    return response.data;
  },

  reopenIssue: async (id: string): Promise<Issue> => {
    const response = await apiClient.patch<Issue>(`/issues/${id}/reopen`);
    return response.data;
  },

  exportCsv: async (): Promise<string> => {
    const response = await apiClient.get<string>("/issues/export", {
      responseType: "text",
    });
    return response.data;
  },

  uploadAttachments: async (
    issueId: string,
    files: { uri: string; name: string; mimeType: string }[],
  ): Promise<IssueAttachment[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
    });
    const response = await apiClient.post<IssueAttachment[]>(
      `/issues/${issueId}/attachments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  deleteAttachment: async (
    issueId: string,
    attachmentId: string,
  ): Promise<void> => {
    await apiClient.delete(`/issues/${issueId}/attachments/${attachmentId}`);
  },
};
