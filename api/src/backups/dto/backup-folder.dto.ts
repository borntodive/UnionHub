export class BackupFileDto {
  id: string;
  name: string;
  size: number;
}

export class BackupFolderDto {
  id: string;
  name: string;
  type: "automatic" | "manual";
  createdTime: string;
  files: BackupFileDto[];
  totalSize: number;
}

export class DriveSpaceDto {
  /** Always 0 — R2 has no quota API */
  total: number;
  /** Always 0 — R2 has no quota API */
  used: number;
  /** Bytes used by all backup files in R2 */
  backupSize: number;
}

export class BackupsListDto {
  automatic: BackupFolderDto[];
  manual: BackupFolderDto[];
  driveSpace: DriveSpaceDto;
}
