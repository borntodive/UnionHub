import apiClient from "./client";
import { Contract } from "../types";

export interface CreateContractData {
  codice: string;
  nome: string;
}

export interface UpdateContractData {
  codice?: string;
  nome?: string;
}

export const contractsApi = {
  getContracts: async (): Promise<Contract[]> => {
    const response = await apiClient.get<Contract[]>("/contracts");
    return response.data;
  },

  getContractById: async (id: string): Promise<Contract> => {
    const response = await apiClient.get<Contract>(`/contracts/${id}`);
    return response.data;
  },

  createContract: async (data: CreateContractData): Promise<Contract> => {
    const response = await apiClient.post<Contract>("/contracts", data);
    return response.data;
  },

  updateContract: async (
    id: string,
    data: UpdateContractData,
  ): Promise<Contract> => {
    const response = await apiClient.put<Contract>(`/contracts/${id}`, data);
    return response.data;
  },

  deleteContract: async (id: string): Promise<void> => {
    await apiClient.delete(`/contracts/${id}`);
  },
};
