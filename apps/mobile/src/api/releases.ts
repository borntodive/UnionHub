import apiClient from "./client";

export interface AppReleaseLatest {
  id: string;
  version: string;
  minVersion: string | null;
  platform: string;
  releaseNotes: string | null;
  createdAt: string;
}

export interface AppRelease extends AppReleaseLatest {}

export interface CreateReleasePayload {
  version: string;
  minVersion?: string;
  platform?: "ios" | "android" | "all";
  releaseNotes?: string;
}

export const releasesApi = {
  getLatest: async (platform: string): Promise<AppReleaseLatest | null> => {
    const res = await apiClient.get<AppReleaseLatest | null>(
      `/app-releases/latest?platform=${platform}`,
    );
    return res.data;
  },

  getAll: async (): Promise<AppRelease[]> => {
    const res = await apiClient.get<AppRelease[]>("/app-releases");
    return res.data;
  },

  create: async (payload: CreateReleasePayload): Promise<AppRelease> => {
    const res = await apiClient.post<AppRelease>("/app-releases", payload);
    return res.data;
  },
};
