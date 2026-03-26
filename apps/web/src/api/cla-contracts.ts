import apiClient from "./client";

export interface ClaContract {
  id: string;
  company: string;
  role: string;
  rank: string;
  basic: number;
  ffp: number;
  sbh: number;
  al: number;
  oob: number;
  woff: number;
  allowance: number;
  diaria: number;
  rsa: number;
  itud: number;
  trainingConfig: unknown;
  effectiveYear: number;
  effectiveMonth: number;
  endYear: number | null;
  endMonth: number | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaContractData {
  company?: string;
  role: string;
  rank: string;
  basic: number;
  ffp: number;
  sbh: number;
  al: number;
  oob: number;
  woff: number;
  allowance: number;
  diaria: number;
  rsa?: number;
  itud?: number;
  effectiveYear: number;
  effectiveMonth?: number;
  isActive?: boolean;
}

export const claContractsApi = {
  findAll: async (year?: number): Promise<ClaContract[]> => {
    const res = await apiClient.get<ClaContract[]>("/admin/cla-contracts", {
      params: year ? { year } : undefined,
    });
    return res.data;
  },

  findOne: async (id: string): Promise<ClaContract> => {
    const res = await apiClient.get<ClaContract>(`/admin/cla-contracts/${id}`);
    return res.data;
  },

  create: async (data: CreateClaContractData): Promise<ClaContract> => {
    const res = await apiClient.post<ClaContract>("/admin/cla-contracts", data);
    return res.data;
  },

  update: async (
    id: string,
    data: Partial<CreateClaContractData>,
  ): Promise<ClaContract> => {
    const res = await apiClient.put<ClaContract>(
      `/admin/cla-contracts/${id}`,
      data,
    );
    return res.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/cla-contracts/${id}`);
  },

  activate: async (id: string): Promise<ClaContract> => {
    const res = await apiClient.post<ClaContract>(
      `/admin/cla-contracts/${id}/activate`,
    );
    return res.data;
  },

  cloneForYear: async (
    id: string,
    year: number,
    isActive?: boolean,
    effectiveMonth?: number,
  ): Promise<ClaContract[]> => {
    const res = await apiClient.post<ClaContract[]>(
      `/admin/cla-contracts/${id}/clone`,
      { year, isActive: isActive ?? true, effectiveMonth: effectiveMonth ?? 1 },
    );
    return res.data;
  },

  deleteAllForYear: async (year: number): Promise<void> => {
    await apiClient.delete(`/admin/cla-contracts/year/${year}`);
  },
};
