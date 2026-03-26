import apiClient from "./client";
import type { User, Ruolo, UserRole } from "@unionhub/shared/types";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface GetUsersParams {
  page?: number;
  perPage?: number;
  search?: string;
  ruolo?: Ruolo;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
}

export interface CreateUserData {
  crewcode: string;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  ruolo?: Ruolo;
  role?: UserRole;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
  note?: string;
  itud?: boolean;
  rsa?: boolean;
  rls?: boolean;
  dataIscrizione?: string;
  dateOfEntry?: string;
  dateOfCaptaincy?: string;
}

export interface UpdateUserData {
  nome?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  ruolo?: Ruolo | null;
  role?: UserRole;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
  note?: string;
  itud?: boolean;
  rsa?: boolean;
  rls?: boolean;
  dataIscrizione?: string;
  dateOfEntry?: string;
  dateOfCaptaincy?: string;
  isActive?: boolean;
}

export interface ExtractedPdfData {
  crewcode?: string;
  nome?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
  dataIscrizione?: string;
  ruolo?: Ruolo;
  confidence: number;
  extractionMethod: "form_fields" | "ocr" | "manual";
  rawFields: Record<string, string>;
}

export interface UserStatistics {
  totalUsers: number;
  byRole: { pilot: number; cabin_crew: number };
  byBase: { base: string; count: number }[];
  byContract: { contract: string; count: number }[];
  recentRegistrations: number;
  itudCount: number;
  rsaCount: number;
}

export const usersApi = {
  getUsersPaginated: async (
    params?: GetUsersParams,
  ): Promise<PaginatedResponse<User>> => {
    const res = await apiClient.get<PaginatedResponse<User>>("/users", {
      params,
    });
    return res.data;
  },

  getDeactivatedUsers: async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<PaginatedResponse<User>> => {
    const res = await apiClient.get<PaginatedResponse<User>>(
      "/users/deactivated",
      { params },
    );
    return res.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const res = await apiClient.get<User>(`/users/${id}`);
    return res.data;
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const res = await apiClient.post<User>("/users", data);
    return res.data;
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const res = await apiClient.patch<User>(`/users/${id}`, data);
    return res.data;
  },

  deactivateUser: async (id: string, reason?: string): Promise<User> => {
    const res = await apiClient.patch<User>(`/users/${id}/deactivate`, {
      reason,
    });
    return res.data;
  },

  reactivateUser: async (id: string): Promise<User> => {
    const res = await apiClient.patch<User>(`/users/${id}/reactivate`, {});
    return res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  getStatistics: async (): Promise<UserStatistics> => {
    const res = await apiClient.get<UserStatistics>("/users/statistics");
    return res.data;
  },

  extractPdf: async (file: File, role: Ruolo): Promise<ExtractedPdfData> => {
    const form = new FormData();
    form.append("pdf", file, file.name);
    form.append("role", role);
    const res = await apiClient.post<ExtractedPdfData>(
      "/users/extract-pdf",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  uploadRegistrationForm: async (userId: string, file: File): Promise<User> => {
    const form = new FormData();
    form.append("pdf", file, file.name);
    const res = await apiClient.post<User>(
      `/users/${userId}/registration-form`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  exportCsv: async (filters?: {
    ruolo?: string;
    baseId?: string;
    contrattoId?: string;
  }): Promise<string> => {
    const res = await apiClient.get<string>("/users/export/csv", {
      params: filters,
      responseType: "text",
    });
    return res.data;
  },

  updateMe: async (data: UpdateUserData): Promise<User> => {
    const res = await apiClient.patch<User>("/users/me", data);
    return res.data;
  },

  bulkImport: async (
    file: File,
    ruolo?: string,
  ): Promise<{
    created: number;
    errors: { row: number; message: string }[];
  }> => {
    const form = new FormData();
    form.append("file", file, file.name);
    if (ruolo) form.append("ruolo", ruolo);
    const res = await apiClient.post<{
      created: number;
      errors: { row: number; message: string }[];
    }>("/users/import/bulk", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
