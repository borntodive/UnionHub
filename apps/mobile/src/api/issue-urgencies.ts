import apiClient from "./client";
import { IssueUrgency } from "../types";

export interface CreateIssueUrgencyData {
  nameIt: string;
  nameEn: string;
  level: number;
}

export interface UpdateIssueUrgencyData {
  nameIt?: string;
  nameEn?: string;
  level?: number;
  active?: boolean;
}

export const issueUrgenciesApi = {
  getAll: async (): Promise<IssueUrgency[]> => {
    const response = await apiClient.get<IssueUrgency[]>("/issue-urgencies");
    return response.data;
  },

  getById: async (id: string): Promise<IssueUrgency> => {
    const response = await apiClient.get<IssueUrgency>(
      `/issue-urgencies/${id}`,
    );
    return response.data;
  },

  create: async (data: CreateIssueUrgencyData): Promise<IssueUrgency> => {
    const response = await apiClient.post<IssueUrgency>(
      "/issue-urgencies",
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateIssueUrgencyData,
  ): Promise<IssueUrgency> => {
    const response = await apiClient.put<IssueUrgency>(
      `/issue-urgencies/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issue-urgencies/${id}`);
  },
};
