import apiClient from "./client";

export interface BackupFile {
  id: string;
  name: string;
  size: number;
}

export interface BackupFolder {
  id: string;
  name: string;
  type: "automatic" | "manual";
  createdTime: string;
  files: BackupFile[];
  totalSize: number;
}

export interface DriveSpace {
  total: number;
  used: number;
  backupSize: number;
}

export interface BackupsList {
  automatic: BackupFolder[];
  manual: BackupFolder[];
  driveSpace: DriveSpace;
}

export const backupsApi = {
  list: async (): Promise<BackupsList> => {
    const response = await apiClient.get<BackupsList>("/backups");
    return response.data;
  },

  create: async (): Promise<{ message: string; folder: string }> => {
    const response = await apiClient.post("/backups");
    return response.data;
  },

  remove: async (folderId: string): Promise<void> => {
    await apiClient.delete(`/backups/${folderId}`);
  },

  restore: async (folderId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/backups/${folderId}/restore`);
    return response.data;
  },
};
