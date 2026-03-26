import apiClient from "./client";
import type {
  Base,
  Contract,
  Grade,
  IssueCategory,
  IssueUrgency,
  Ruolo,
} from "@unionhub/shared/types";

/* ─── Contracts ──────────────────────────────────────────────── */
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
    const res = await apiClient.get<Contract[]>("/contracts");
    return res.data;
  },
  createContract: async (data: CreateContractData): Promise<Contract> => {
    const res = await apiClient.post<Contract>("/contracts", data);
    return res.data;
  },
  updateContract: async (
    id: string,
    data: UpdateContractData,
  ): Promise<Contract> => {
    const res = await apiClient.put<Contract>(`/contracts/${id}`, data);
    return res.data;
  },
  deleteContract: async (id: string): Promise<void> => {
    await apiClient.delete(`/contracts/${id}`);
  },
};

/* ─── Grades ─────────────────────────────────────────────────── */
export interface CreateGradeData {
  codice: string;
  nome: string;
  ruolo: Ruolo;
}
export interface UpdateGradeData {
  codice?: string;
  nome?: string;
  ruolo?: Ruolo;
}

export const gradesApi = {
  getGrades: async (): Promise<Grade[]> => {
    const res = await apiClient.get<Grade[]>("/grades");
    return res.data;
  },
  createGrade: async (data: CreateGradeData): Promise<Grade> => {
    const res = await apiClient.post<Grade>("/grades", data);
    return res.data;
  },
  updateGrade: async (id: string, data: UpdateGradeData): Promise<Grade> => {
    const res = await apiClient.put<Grade>(`/grades/${id}`, data);
    return res.data;
  },
  deleteGrade: async (id: string): Promise<void> => {
    await apiClient.delete(`/grades/${id}`);
  },
};

/* ─── Bases ──────────────────────────────────────────────────── */
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
    const res = await apiClient.get<Base[]>("/bases");
    return res.data;
  },
  createBase: async (data: CreateBaseData): Promise<Base> => {
    const res = await apiClient.post<Base>("/bases", data);
    return res.data;
  },
  updateBase: async (id: string, data: UpdateBaseData): Promise<Base> => {
    const res = await apiClient.put<Base>(`/bases/${id}`, data);
    return res.data;
  },
  deleteBase: async (id: string): Promise<void> => {
    await apiClient.delete(`/bases/${id}`);
  },
};

/* ─── Issue Categories ───────────────────────────────────────── */
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
  getCategories: async (ruolo?: string): Promise<IssueCategory[]> => {
    const res = await apiClient.get<IssueCategory[]>("/issue-categories", {
      params: ruolo ? { ruolo } : undefined,
    });
    return res.data;
  },
  createCategory: async (
    data: CreateIssueCategoryData,
  ): Promise<IssueCategory> => {
    const res = await apiClient.post<IssueCategory>("/issue-categories", data);
    return res.data;
  },
  updateCategory: async (
    id: string,
    data: UpdateIssueCategoryData,
  ): Promise<IssueCategory> => {
    const res = await apiClient.put<IssueCategory>(
      `/issue-categories/${id}`,
      data,
    );
    return res.data;
  },
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/issue-categories/${id}`);
  },
};

/* ─── Issue Urgencies ────────────────────────────────────────── */
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
  getUrgencies: async (): Promise<IssueUrgency[]> => {
    const res = await apiClient.get<IssueUrgency[]>("/issue-urgencies");
    return res.data;
  },
  createUrgency: async (
    data: CreateIssueUrgencyData,
  ): Promise<IssueUrgency> => {
    const res = await apiClient.post<IssueUrgency>("/issue-urgencies", data);
    return res.data;
  },
  updateUrgency: async (
    id: string,
    data: UpdateIssueUrgencyData,
  ): Promise<IssueUrgency> => {
    const res = await apiClient.put<IssueUrgency>(
      `/issue-urgencies/${id}`,
      data,
    );
    return res.data;
  },
  deleteUrgency: async (id: string): Promise<void> => {
    await apiClient.delete(`/issue-urgencies/${id}`);
  },
};
