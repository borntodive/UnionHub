import apiClient from "./client";
import type { Issue, IssueStatus } from "@unionhub/shared/types";

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
  getIssues: async (): Promise<Issue[]> => {
    const res = await apiClient.get<Issue[]>("/issues");
    return res.data;
  },

  getMyIssues: async (): Promise<Issue[]> => {
    const res = await apiClient.get<Issue[]>("/issues/my");
    return res.data;
  },

  getById: async (id: string): Promise<Issue> => {
    const res = await apiClient.get<Issue>(`/issues/${id}`);
    return res.data;
  },

  createIssue: async (data: CreateIssueData): Promise<Issue> => {
    const res = await apiClient.post<Issue>("/issues", data);
    return res.data;
  },

  updateIssue: async (id: string, data: UpdateIssueData): Promise<Issue> => {
    const res = await apiClient.patch<Issue>(`/issues/${id}`, data);
    return res.data;
  },

  reopenIssue: async (id: string): Promise<Issue> => {
    const res = await apiClient.patch<Issue>(`/issues/${id}/reopen`);
    return res.data;
  },

  exportCsv: async (): Promise<Blob> => {
    const res = await apiClient.get("/issues/export", { responseType: "blob" });
    return res.data;
  },
};
