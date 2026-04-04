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
  /** Total Drive quota for the account (bytes) */
  total: number;
  /** Total bytes used on the Drive account */
  used: number;
  /** Bytes used by all files inside the backup root folder */
  backupSize: number;
}

export class BackupsListDto {
  automatic: BackupFolderDto[];
  manual: BackupFolderDto[];
  driveSpace: DriveSpaceDto;
}
