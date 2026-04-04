import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { spawn, execSync } from "child_process";
import { pipeline } from "stream/promises";
import { createWriteStream, createReadStream } from "fs";
import { createGunzip } from "zlib";
import {
  BackupFolderDto,
  BackupFileDto,
  BackupsListDto,
  DriveSpaceDto,
} from "./dto/backup-folder.dto";

const SUBFOLDER_AUTOMATIC = "Automatic";
const SUBFOLDER_MANUAL = "Manual";

@Injectable()
export class BackupsService {
  private isBackupRunning = false;

  constructor(private readonly configService: ConfigService) {}

  private getDrive() {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET");
    const refreshToken = this.configService.get<string>(
      "BACKUP_DRIVE_REFRESH_TOKEN",
    );

    if (!clientId || !clientSecret || !refreshToken) {
      throw new InternalServerErrorException(
        "Google Drive credentials not configured",
      );
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth });
  }

  private getRootFolderId(): string {
    const folderId = this.configService.get<string>("BACKUP_DRIVE_FOLDER_ID");
    if (!folderId) {
      throw new InternalServerErrorException(
        "BACKUP_DRIVE_FOLDER_ID not configured",
      );
    }
    return folderId;
  }

  /** Returns the Drive ID of a named subfolder, creating it if needed. */
  private async getOrCreateSubfolder(
    drive: ReturnType<typeof google.drive>,
    name: string,
    parentId: string,
  ): Promise<string> {
    const res = await drive.files.list({
      q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });
    return created.data.id!;
  }

  /** Lists dated backup folders inside a type subfolder. */
  private async listFoldersInSubfolder(
    drive: ReturnType<typeof google.drive>,
    typeFolderId: string,
    type: "automatic" | "manual",
  ): Promise<BackupFolderDto[]> {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and '${typeFolderId}' in parents and trashed=false`,
      fields: "files(id, name, createdTime)",
      orderBy: "name desc",
      spaces: "drive",
      pageSize: 200,
    });

    const folders = (res.data.files || []).filter((f) =>
      /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(f.name || ""),
    );

    const result: BackupFolderDto[] = [];
    for (const folder of folders) {
      const filesRes = await drive.files.list({
        q: `'${folder.id}' in parents and trashed=false`,
        fields: "files(id, name, size)",
        spaces: "drive",
      });

      const files: BackupFileDto[] = (filesRes.data.files || []).map((f) => ({
        id: f.id!,
        name: f.name!,
        size: parseInt(f.size || "0", 10),
      }));

      result.push({
        id: folder.id!,
        name: folder.name!,
        type,
        createdTime: folder.createdTime!,
        files,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
      });
    }

    return result;
  }

  async listBackups(): Promise<BackupsListDto> {
    const drive = this.getDrive();
    const rootFolderId = this.getRootFolderId();

    // Fetch subfolders + Drive quota in parallel
    const [autoFolderId, manualFolderId, aboutRes] = await Promise.all([
      this.getOrCreateSubfolder(drive, SUBFOLDER_AUTOMATIC, rootFolderId),
      this.getOrCreateSubfolder(drive, SUBFOLDER_MANUAL, rootFolderId),
      drive.about.get({ fields: "storageQuota" }),
    ]);

    const [automatic, manual] = await Promise.all([
      this.listFoldersInSubfolder(drive, autoFolderId, "automatic"),
      this.listFoldersInSubfolder(drive, manualFolderId, "manual"),
    ]);

    const quota = aboutRes.data.storageQuota || {};
    const backupSize = [...automatic, ...manual].reduce(
      (acc, f) => acc + f.totalSize,
      0,
    );

    const driveSpace: DriveSpaceDto = {
      total: parseInt(quota.limit || "0", 10),
      used: parseInt(quota.usage || "0", 10),
      backupSize,
    };

    return { automatic, manual, driveSpace };
  }

  async deleteBackup(folderId: string): Promise<void> {
    const drive = this.getDrive();
    const rootFolderId = this.getRootFolderId();

    // Safety: verify the folder's parent is one of our type subfolders,
    // which itself lives inside rootFolderId.
    const meta = await drive.files
      .get({ fileId: folderId, fields: "parents, name" })
      .catch(() => null);
    if (!meta?.data.parents?.length) {
      throw new NotFoundException("Backup not found");
    }

    const typeFolderId = meta.data.parents[0];
    const typeMeta = await drive.files
      .get({ fileId: typeFolderId, fields: "parents, name" })
      .catch(() => null);

    if (
      !typeMeta?.data.parents?.includes(rootFolderId) ||
      ![SUBFOLDER_AUTOMATIC, SUBFOLDER_MANUAL].includes(
        typeMeta.data.name || "",
      )
    ) {
      throw new NotFoundException("Backup not found");
    }

    await drive.files.delete({ fileId: folderId });
  }

  async createBackup(): Promise<{ message: string; folder: string }> {
    if (this.isBackupRunning) {
      throw new ConflictException(
        "A backup is already in progress. Please wait.",
      );
    }

    this.isBackupRunning = true;

    const scriptPath = path.resolve(__dirname, "../../scripts/backup.sh");
    const cwd = path.resolve(__dirname, "../../");

    return new Promise((resolve, reject) => {
      const proc = spawn("bash", [scriptPath], {
        cwd,
        env: { ...process.env, BACKUP_TYPE: SUBFOLDER_MANUAL },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => (stdout += d.toString()));
      proc.stderr.on("data", (d) => (stderr += d.toString()));

      proc.on("close", (code) => {
        this.isBackupRunning = false;
        if (code !== 0) {
          reject(
            new InternalServerErrorException(
              `Backup script exited with code ${code}: ${stderr}`,
            ),
          );
          return;
        }
        const match = stdout.match(/Day folder "([^"]+)"/);
        const folder = match?.[1] ?? "unknown";
        resolve({ message: "Backup completed successfully", folder });
      });

      proc.on("error", (err) => {
        this.isBackupRunning = false;
        reject(
          new InternalServerErrorException(
            `Failed to start backup script: ${err.message}`,
          ),
        );
      });
    });
  }

  async restoreBackup(folderId: string): Promise<{ message: string }> {
    const drive = this.getDrive();
    const rootFolderId = this.getRootFolderId();

    // Safety: same 2-hop check as deleteBackup
    const meta = await drive.files
      .get({ fileId: folderId, fields: "parents, name" })
      .catch(() => null);
    if (!meta?.data.parents?.length) {
      throw new NotFoundException("Backup not found");
    }

    const typeFolderId = meta.data.parents[0];
    const typeMeta = await drive.files
      .get({ fileId: typeFolderId, fields: "parents, name" })
      .catch(() => null);

    if (
      !typeMeta?.data.parents?.includes(rootFolderId) ||
      ![SUBFOLDER_AUTOMATIC, SUBFOLDER_MANUAL].includes(
        typeMeta.data.name || "",
      )
    ) {
      throw new NotFoundException("Backup not found");
    }

    // List files inside the backup folder
    const filesRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    const driveFiles = filesRes.data.files || [];

    const dbFile = driveFiles.find(
      (f) => f.name?.startsWith("db_") && f.name.endsWith(".sql.gz"),
    );
    if (!dbFile) {
      throw new NotFoundException(
        "No database dump found in this backup folder",
      );
    }

    const uploadsFile = driveFiles.find(
      (f) => f.name?.startsWith("uploads_") && f.name.endsWith(".tar.gz"),
    );

    const ts = Date.now();
    const tmpDbGz = path.join(os.tmpdir(), `uc-restore-${ts}.sql.gz`);
    const tmpDbSql = path.join(os.tmpdir(), `uc-restore-${ts}.sql`);
    const tmpUploadsGz = uploadsFile
      ? path.join(os.tmpdir(), `uc-restore-${ts}-uploads.tar.gz`)
      : null;

    try {
      // --- 1. Download & restore DB ---
      const dlDb = await drive.files.get(
        { fileId: dbFile.id!, alt: "media" },
        { responseType: "stream" },
      );
      await pipeline(dlDb.data as any, createWriteStream(tmpDbGz));
      await pipeline(
        createReadStream(tmpDbGz),
        createGunzip(),
        createWriteStream(tmpDbSql),
      );

      const host = this.configService.get("DB_HOST") || "localhost";
      const port = this.configService.get("DB_PORT") || "5432";
      const user = this.configService.get("DB_USERNAME") || "postgres";
      const password = this.configService.get("DB_PASSWORD") || "";
      const dbName = this.configService.get("DB_DATABASE") || "unionhub";
      const env = { ...process.env, PGPASSWORD: password };

      execSync(
        `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`,
        { env },
      );
      execSync(
        `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -f ${tmpDbSql}`,
        { env },
      );

      // --- 2. Download & restore uploads (if present) ---
      if (uploadsFile && tmpUploadsGz) {
        const uploadBaseDir =
          this.configService.get<string>("UPLOAD_BASE_DIR") ||
          path.resolve(__dirname, "../../uploads");

        const dlUploads = await drive.files.get(
          { fileId: uploadsFile.id!, alt: "media" },
          { responseType: "stream" },
        );
        await pipeline(dlUploads.data as any, createWriteStream(tmpUploadsGz));

        execSync(`rm -rf "${uploadBaseDir}"`);
        fs.mkdirSync(path.dirname(uploadBaseDir), { recursive: true });
        execSync(
          `tar -xzf "${tmpUploadsGz}" -C "${path.dirname(uploadBaseDir)}"`,
        );
      }

      return {
        message: uploadsFile
          ? "Database and uploads restored successfully"
          : "Database restored successfully (no uploads archive in this backup)",
      };
    } finally {
      for (const f of [tmpDbGz, tmpDbSql, tmpUploadsGz]) {
        if (f)
          try {
            fs.unlinkSync(f);
          } catch {
            /* ignore */
          }
      }
    }
  }
}
