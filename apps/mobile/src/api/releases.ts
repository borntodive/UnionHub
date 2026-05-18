import apiClient from "./client";

export interface AppReleaseLatest {
  id: string;
  version: string;
  minVersion: string | null;
  platform: string;
  releaseNotes: string | null;
  apkFilename: string | null;
  createdAt: string;
}

export interface AppRelease extends AppReleaseLatest {}

export interface CreateReleasePayload {
  version: string;
  minVersion?: string;
  platform?: "ios" | "android" | "all";
  releaseNotes?: string;
  apk?: {
    uri: string;
    name: string;
    type: string;
  };
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
    const formData = new FormData();
    formData.append("version", payload.version);
    if (payload.minVersion) formData.append("minVersion", payload.minVersion);
    if (payload.platform) formData.append("platform", payload.platform);
    if (payload.releaseNotes) formData.append("releaseNotes", payload.releaseNotes);
    if (payload.apk) {
      formData.append("apk", payload.apk as any);
    }
    const res = await apiClient.post<AppRelease>("/app-releases", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
