import apiClient from "./client";
import { IssueCategory, Ruolo } from "../types";

export interface CreateIssueCategoryData {
  nameIt: string;
  nameEn: string;
  ruolo: Ruolo;
}

export interface UpdateIssueCategoryData {
  nameIt?: string;
  nameEn?: string;
  ruolo?: Ruolo;
  active?: boolean;
}

export const issueCategoriesApi = {
  getAll: async (ruolo?: Ruolo): Promise<IssueCategory[]> => {
    const params = ruolo ? { ruolo } : {};
    const response = await apiClient.get<IssueCategory[]>("/issue-categories", {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<IssueCategory> => {
    const response = await apiClient.get<IssueCategory>(
      `/issue-categories/${id}`,
    );
    return response.data;
  },

  create: async (data: CreateIssueCategoryData): Promise<IssueCategory> => {
    const response = await apiClient.post<IssueCategory>(
      "/issue-categories",
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateIssueCategoryData,
  ): Promise<IssueCategory> => {
    const response = await apiClient.put<IssueCategory>(
      `/issue-categories/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issue-categories/${id}`);
  },
};
