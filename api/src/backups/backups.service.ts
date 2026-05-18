import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { spawn, execSync } from "child_process";
import { pipeline } from "stream/promises";
import { createWriteStream, createReadStream } from "fs";
import { createGunzip } from "zlib";
import { Readable } from "stream";
import {
  BackupFolderDto,
  BackupFileDto,
  BackupsListDto,
  DriveSpaceDto,
} from "./dto/backup-folder.dto";

const VALID_PREFIX = /^(automatic|manual)\/\d{4}-\d{2}-\d{2}_\d{4}$/;

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private isBackupRunning = false;

  constructor(private readonly configService: ConfigService) {}

  private getS3Client(): S3Client {
    const accountId = this.configService.get<string>("R2_ACCOUNT_ID");
    const accessKeyId = this.configService.get<string>("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>(
      "R2_SECRET_ACCESS_KEY",
    );

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException("R2 credentials not configured");
    }

    return new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private getBucketName(): string {
    const bucket = this.configService.get<string>("R2_BUCKET_NAME");
    if (!bucket) {
      throw new InternalServerErrorException("R2_BUCKET_NAME not configured");
    }
    return bucket;
  }

  private encodeId(prefix: string): string {
    return Buffer.from(prefix).toString("base64url");
  }

  private decodeAndValidate(folderId: string): string {
    let prefix: string;
    try {
      prefix = Buffer.from(folderId, "base64url").toString("utf8");
    } catch {
      throw new NotFoundException("Backup not found");
    }
    if (!VALID_PREFIX.test(prefix)) {
      throw new NotFoundException("Backup not found");
    }
    return prefix;
  }

  private createdTimeFromName(name: string): string {
    const [datePart, timePart] = name.split("_");
    const hh = timePart.slice(0, 2);
    const mm = timePart.slice(2, 4);
    return new Date(`${datePart}T${hh}:${mm}:00Z`).toISOString();
  }

  private async listFoldersByPrefix(
    s3: S3Client,
    bucket: string,
    typePrefix: "automatic/" | "manual/",
  ): Promise<BackupFolderDto[]> {
    const type = typePrefix.replace("/", "") as "automatic" | "manual";
    const folders = new Set<string>();
    let continuationToken: string | undefined;

    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: typePrefix,
          Delimiter: "/",
          ContinuationToken: continuationToken,
        }),
      );
      for (const cp of res.CommonPrefixes || []) {
        if (cp.Prefix) folders.add(cp.Prefix);
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    const result: BackupFolderDto[] = [];

    for (const folderKey of [...folders].sort().reverse()) {
      const name = folderKey.replace(typePrefix, "").replace(/\/$/, "");
      if (!/^\d{4}-\d{2}-\d{2}_\d{4}$/.test(name)) continue;

      const filesRes = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: folderKey }),
      );

      const files: BackupFileDto[] = (filesRes.Contents || [])
        .filter((obj) => obj.Key && obj.Key !== folderKey)
        .map((obj) => ({
          id: path.basename(obj.Key!),
          name: path.basename(obj.Key!),
          size: obj.Size || 0,
        }));

      const prefix = `${type}/${name}`;
      result.push({
        id: this.encodeId(prefix),
        name,
        type,
        createdTime: this.createdTimeFromName(name),
        files,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
      });
    }

    return result;
  }

  async listBackups(): Promise<BackupsListDto> {
    const s3 = this.getS3Client();
    const bucket = this.getBucketName();

    const [automatic, manual] = await Promise.all([
      this.listFoldersByPrefix(s3, bucket, "automatic/"),
      this.listFoldersByPrefix(s3, bucket, "manual/"),
    ]);

    const backupSize = [...automatic, ...manual].reduce(
      (acc, f) => acc + f.totalSize,
      0,
    );

    const driveSpace: DriveSpaceDto = {
      total: 0,
      used: 0,
      backupSize,
    };

    return { automatic, manual, driveSpace };
  }

  async deleteBackup(folderId: string): Promise<void> {
    const prefix = this.decodeAndValidate(folderId);
    const s3 = this.getS3Client();
    const bucket = this.getBucketName();

    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/` }),
    );

    const objects = (res.Contents || [])
      .filter((obj) => obj.Key)
      .map((obj) => ({ Key: obj.Key! }));

    if (objects.length === 0) {
      throw new NotFoundException("Backup not found");
    }

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: objects },
      }),
    );
  }

  async createBackup(): Promise<{ message: string; folder: string }> {
    if (this.isBackupRunning) {
      throw new ConflictException(
        "A backup is already in progress. Please wait.",
      );
    }

    this.isBackupRunning = true;

    const scriptPath = path.resolve(__dirname, "../../../scripts/backup.sh");
    const cwd = path.resolve(__dirname, "../../../");

    return new Promise((resolve, reject) => {
      const proc = spawn("bash", [scriptPath], {
        cwd,
        env: { ...process.env, BACKUP_TYPE: "Manual" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => (stdout += d.toString()));
      proc.stderr.on("data", (d) => (stderr += d.toString()));

      proc.on("close", (code) => {
        this.isBackupRunning = false;
        if (code !== 0) {
          this.logger.error(
            `Backup script exited with code ${code}: ${stderr}`,
          );
          reject(
            new InternalServerErrorException(
              "Backup failed. Please check server logs.",
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
    const prefix = this.decodeAndValidate(folderId);
    const s3 = this.getS3Client();
    const bucket = this.getBucketName();

    const folderKey = `${prefix}/`;
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: folderKey }),
    );

    const keys = (res.Contents || [])
      .filter((obj) => obj.Key && obj.Key !== folderKey)
      .map((obj) => obj.Key!);

    const dbKey = keys.find(
      (k) => path.basename(k).startsWith("db_") && k.endsWith(".sql.gz"),
    );
    if (!dbKey) {
      throw new NotFoundException(
        "No database dump found in this backup folder",
      );
    }

    const uploadsKey = keys.find(
      (k) => path.basename(k).startsWith("uploads_") && k.endsWith(".tar.gz"),
    );

    const ts = Date.now();
    const tmpDbGz = path.join(os.tmpdir(), `uc-restore-${ts}.sql.gz`);
    const tmpDbSql = path.join(os.tmpdir(), `uc-restore-${ts}.sql`);
    const tmpUploadsGz = uploadsKey
      ? path.join(os.tmpdir(), `uc-restore-${ts}-uploads.tar.gz`)
      : null;

    try {
      // 1. Download & restore DB
      const dbObj = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: dbKey }),
      );
      await pipeline(dbObj.Body as Readable, createWriteStream(tmpDbGz));
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

      // 2. Download & restore uploads (if present)
      if (uploadsKey && tmpUploadsGz) {
        const uploadBaseDir =
          this.configService.get<string>("UPLOAD_BASE_DIR") ||
          path.resolve(__dirname, "../../../uploads");

        const uploadsObj = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: uploadsKey }),
        );
        await pipeline(
          uploadsObj.Body as Readable,
          createWriteStream(tmpUploadsGz),
        );

        execSync(`rm -rf "${uploadBaseDir}"`);
        fs.mkdirSync(path.dirname(uploadBaseDir), { recursive: true });
        execSync(
          `tar -xzf "${tmpUploadsGz}" -C "${path.dirname(uploadBaseDir)}"`,
        );
      }

      return {
        message: uploadsKey
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
