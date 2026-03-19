import apiClient from "./client";
import { User, UserRole, Ruolo } from "../types";

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
  confidence: number;
  extractionMethod: "form_fields" | "ocr" | "manual";
  rawFields: Record<string, string>;
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
  dataIscrizione?: string;
  dateOfEntry?: string;
  dateOfCaptaincy?: string;
}

export interface UpdateUserData {
  nome?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
  note?: string;
  itud?: boolean;
  rsa?: boolean;
  dataIscrizione?: string;
  dateOfEntry?: string;
  dateOfCaptaincy?: string;
}

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
  ruolo?: "pilot" | "cabin_crew";
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
}

export const usersApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>("/users/me");
    return response.data;
  },

  updateMe: async (data: UpdateUserData): Promise<User> => {
    const response = await apiClient.patch<User>("/users/me", data);
    return response.data;
  },

  getUsers: async (params?: GetUsersParams): Promise<User[]> => {
    const response = await apiClient.get<PaginatedResponse<User>>("/users", {
      params,
    });
    return response.data.data;
  },

  getUsersPaginated: async (
    page: number,
    perPage: number,
    filters?: Omit<GetUsersParams, "page" | "perPage">,
  ): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>("/users", {
      params: { page, perPage, ...filters },
    });
    return response.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const response = await apiClient.post<User>("/users", data);
    return response.data;
  },

  extractPdf: async (
    fileUri: string,
    role: Ruolo,
  ): Promise<ExtractedPdfData> => {
    const formData = new FormData();
    formData.append("pdf", {
      uri: fileUri,
      name: "registration.pdf",
      type: "application/pdf",
    } as any);
    formData.append("role", role);

    const response = await apiClient.post<ExtractedPdfData>(
      "/users/extract-pdf",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  uploadRegistrationForm: async (
    userId: string,
    fileUri: string,
  ): Promise<User> => {
    const formData = new FormData();
    formData.append("pdf", {
      uri: fileUri,
      name: "registration_form.pdf",
      type: "application/pdf",
    } as any);

    const response = await apiClient.post<User>(
      `/users/${userId}/registration-form`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  getRegistrationForm: async (
    userId: string,
  ): Promise<{ fileUrl: string; filename: string }> => {
    const response = await apiClient.get<{ fileUrl: string; filename: string }>(
      `/users/${userId}/registration-form`,
    );
    return response.data;
  },

  convertPdfToImage: async (
    base64Pdf: string,
  ): Promise<{ imageBase64: string; mimeType: string }> => {
    const response = await apiClient.post<{
      imageBase64: string;
      mimeType: string;
    }>("/users/convert-pdf-to-image", {
      pdfBase64: base64Pdf,
    });
    return response.data;
  },

  // Deactivated users management (SuperAdmin only)
  getDeactivated: async (params?: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>(
      "/users/deactivated/list",
      { params },
    );
    return response.data;
  },

  reactivateDeactivated: async (id: string): Promise<User> => {
    const response = await apiClient.post<User>(
      `/users/deactivated/${id}/reactivate`,
    );
    return response.data;
  },

  permanentlyDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/deactivated/${id}/permanent`);
  },

  // Statistics and Export
  getStatistics: async (): Promise<{
    totalUsers: number;
    byRole: { pilot: number; cabin_crew: number };
    byBase: { base: string; count: number }[];
    byContract: { contract: string; count: number }[];
    recentRegistrations: number;
    itudCount: number;
    rsaCount: number;
  }> => {
    const response = await apiClient.get("/users/statistics/dashboard");
    return response.data;
  },

  exportToCsv: async (filters?: {
    ruolo?: string;
    baseId?: string;
    contrattoId?: string;
  }): Promise<{ csv: string; filename: string }> => {
    const response = await apiClient.get("/users/export/csv", {
      params: filters,
    });
    return response.data;
  },

  bulkImport: async (
    fileUri: string,
    fileName: string,
    ruolo?: Ruolo | null,
  ): Promise<{
    created: number;
    errors: { row: number; error: string }[];
    total: number;
  }> => {
    const formData = new FormData();

    // Determine MIME type based on file extension
    const extension = fileName
      .substring(fileName.lastIndexOf("."))
      .toLowerCase();
    let mimeType = "text/csv";
    if (extension === ".xlsx")
      mimeType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (extension === ".xls") mimeType = "application/vnd.ms-excel";

    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    // Add role parameter for SuperAdmin
    if (ruolo) {
      formData.append("ruolo", ruolo);
    }

    const response = await apiClient.post("/users/import/bulk", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
