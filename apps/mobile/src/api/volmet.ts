import apiClient from "./client";

export interface Volmet {
  id: string;
  icao: string;
  iata?: string;
  name: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  frequencies: string[];
  region: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVolmetData {
  icao: string;
  iata?: string;
  name: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  frequencies: string[];
  region: string;
  isActive?: boolean;
}

export interface UpdateVolmetData {
  icao?: string;
  iata?: string;
  name?: string;
  city?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  frequencies?: string[];
  region?: string;
  isActive?: boolean;
}

export const volmetApi = {
  getAll: async (activeOnly: boolean = true): Promise<Volmet[]> => {
    const response = await apiClient.get<Volmet[]>("/volmet", {
      params: { activeOnly },
    });
    return response.data;
  },

  getByRegion: async (region: string): Promise<Volmet[]> => {
    const response = await apiClient.get<Volmet[]>("/volmet", {
      params: { region },
    });
    return response.data;
  },

  search: async (query: string): Promise<Volmet[]> => {
    const response = await apiClient.get<Volmet[]>(`/volmet/search/${query}`);
    return response.data;
  },

  getRegions: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>("/volmet/regions");
    return response.data;
  },

  getById: async (id: string): Promise<Volmet> => {
    const response = await apiClient.get<Volmet>(`/volmet/${id}`);
    return response.data;
  },

  create: async (data: CreateVolmetData): Promise<Volmet> => {
    const response = await apiClient.post<Volmet>("/volmet", data);
    return response.data;
  },

  update: async (id: string, data: UpdateVolmetData): Promise<Volmet> => {
    const response = await apiClient.put<Volmet>(`/volmet/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/volmet/${id}`);
  },
};
