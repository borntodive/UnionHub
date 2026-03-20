import apiClient from "./client";
import { Grade, Ruolo } from "../types";

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
    const response = await apiClient.get<Grade[]>("/grades");
    return response.data;
  },

  getGradeById: async (id: string): Promise<Grade> => {
    const response = await apiClient.get<Grade>(`/grades/${id}`);
    return response.data;
  },

  createGrade: async (data: CreateGradeData): Promise<Grade> => {
    const response = await apiClient.post<Grade>("/grades", data);
    return response.data;
  },

  updateGrade: async (id: string, data: UpdateGradeData): Promise<Grade> => {
    const response = await apiClient.put<Grade>(`/grades/${id}`, data);
    return response.data;
  },

  deleteGrade: async (id: string): Promise<void> => {
    await apiClient.delete(`/grades/${id}`);
  },
};
