import apiClient from "./client";
import { Base } from "../types";

export interface CreateBaseData {
  codice: string;
  nome: string;
}

export interface UpdateBaseData {
  codice?: string;
  nome?: string;
}

export const basesApi = {
  getBases: async (): Promise<Base[]> => {
    const response = await apiClient.get<Base[]>("/bases");
    return response.data;
  },

  getBaseById: async (id: string): Promise<Base> => {
    const response = await apiClient.get<Base>(`/bases/${id}`);
    return response.data;
  },

  createBase: async (data: CreateBaseData): Promise<Base> => {
    const response = await apiClient.post<Base>("/bases", data);
    return response.data;
  },

  updateBase: async (id: string, data: UpdateBaseData): Promise<Base> => {
    const response = await apiClient.put<Base>(`/bases/${id}`, data);
    return response.data;
  },

  deleteBase: async (id: string): Promise<void> => {
    await apiClient.delete(`/bases/${id}`);
  },
};
