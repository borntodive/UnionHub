import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { BackupsService } from "./backups.service";

jest.mock("@aws-sdk/client-s3", () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    ListObjectsV2Command: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectsCommand: jest.fn().mockImplementation((input) => ({ input })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    __mockSend: mockSend,
  };
});

import * as s3Module from "@aws-sdk/client-s3";
const mockSend: jest.Mock = (s3Module as any).__mockSend;

const mockConfig: Record<string, string> = {
  R2_ACCOUNT_ID: "test-account",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "test-bucket",
};

describe("BackupsService", () => {
  let service: BackupsService;

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupsService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => mockConfig[key] },
        },
      ],
    }).compile();

    service = module.get<BackupsService>(BackupsService);
  });

  describe("listBackups", () => {
    it("returns automatic and manual folders with encoded IDs", async () => {
      mockSend
        // automatic/ listing (with delimiter)
        .mockResolvedValueOnce({
          CommonPrefixes: [{ Prefix: "automatic/2026-01-15_2300/" }],
        })
        // manual/ listing (with delimiter)
        .mockResolvedValueOnce({
          CommonPrefixes: [{ Prefix: "manual/2026-01-10_1400/" }],
        })
        // files inside automatic folder
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: "automatic/2026-01-15_2300/db_20260115_2300.sql.gz",
              Size: 1024,
            },
            {
              Key: "automatic/2026-01-15_2300/uploads_20260115_2300.tar.gz",
              Size: 2048,
            },
          ],
        })
        // files inside manual folder
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: "manual/2026-01-10_1400/db_20260110_1400.sql.gz",
              Size: 512,
            },
          ],
        });

      const result = await service.listBackups();

      expect(result.automatic).toHaveLength(1);
      expect(result.automatic[0].name).toBe("2026-01-15_2300");
      expect(result.automatic[0].type).toBe("automatic");
      expect(result.automatic[0].totalSize).toBe(3072);
      expect(result.automatic[0].id).toBe(
        Buffer.from("automatic/2026-01-15_2300").toString("base64url"),
      );

      expect(result.manual).toHaveLength(1);
      expect(result.manual[0].name).toBe("2026-01-10_1400");
      expect(result.manual[0].type).toBe("manual");

      expect(result.driveSpace.total).toBe(0);
      expect(result.driveSpace.used).toBe(0);
      expect(result.driveSpace.backupSize).toBe(3584);
    });
  });

  describe("deleteBackup", () => {
    it("deletes all objects in the folder", async () => {
      const folderId = Buffer.from("automatic/2026-01-15_2300").toString(
        "base64url",
      );

      mockSend
        .mockResolvedValueOnce({
          Contents: [
            { Key: "automatic/2026-01-15_2300/db_file.sql.gz" },
            { Key: "automatic/2026-01-15_2300/uploads_file.tar.gz" },
          ],
        })
        .mockResolvedValueOnce({});

      await expect(service.deleteBackup(folderId)).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("throws NotFoundException for invalid folderId", async () => {
      await expect(
        service.deleteBackup("not-valid-base64url!!"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when folder has no objects", async () => {
      const folderId = Buffer.from("automatic/2026-01-15_2300").toString(
        "base64url",
      );
      mockSend.mockResolvedValueOnce({ Contents: [] });

      await expect(service.deleteBackup(folderId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createBackup", () => {
    it("rejects with ConflictException when backup already running", async () => {
      // Trigger the lock
      (service as any).isBackupRunning = true;
      await expect(service.createBackup()).rejects.toThrow(ConflictException);
    });
  });

  describe("decodeAndValidate (internal via deleteBackup)", () => {
    it("rejects prefix with path traversal", async () => {
      const malicious = Buffer.from("automatic/../../../etc/passwd").toString(
        "base64url",
      );
      await expect(service.deleteBackup(malicious)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects unknown type prefix", async () => {
      const bad = Buffer.from("unknown/2026-01-15_2300").toString("base64url");
      await expect(service.deleteBackup(bad)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
