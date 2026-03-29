import apiClient from "./client";
import { AuthResponse, LoginCredentials, ChangePasswordData } from "../types";

export interface PublicRegisterPayload {
  nome: string;
  cognome: string;
  email: string;
  crewcode: string;
  telefono: string;
  ruolo: string;
  gradeId: string;
  baseId: string;
  codiceFiscale: string;
  natoA: string;
  dataNascita: string;
  residenteA: string;
  cap: string;
  provincia: string;
  via: string;
  numeroCivico: string;
  tipoRapporto: string;
  luogo: string;
  consenso1: boolean;
  consenso2: boolean;
  signatureBase64: string;
  attivista?: string;
  tempId?: string;
}

export const authApi = {
  /** Step 3→4: generate PDF on server, save as temp, return tempId. */
  prepare: async (
    dto: Omit<PublicRegisterPayload, "tempId">,
  ): Promise<{ tempId: string }> => {
    const response = await apiClient.post("/auth/register/prepare", dto);
    return response.data;
  },

  /** Fetch base64-encoded PDF for preview (no data: prefix). */
  getPreview: async (tempId: string): Promise<string> => {
    const response = await apiClient.get(`/auth/register/preview/${tempId}`);
    return response.data.base64;
  },

  register: async (
    dto: PublicRegisterPayload,
  ): Promise<{ message: string; userId: string }> => {
    const response = await apiClient.post("/auth/register", dto);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      "/auth/login",
      credentials,
    );
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refreshToken });
  },

  changePassword: async (data: ChangePasswordData): Promise<void> => {
    await apiClient.post("/auth/change-password", data);
  },

  refreshToken: async (
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post("/auth/refresh", { refreshToken });
    return response.data;
  },
};
