# Remove Google OAuth Dependency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unstable Google OAuth refresh tokens with IMAP+App Password (Gmail reading) and Cloudflare R2 (backups).

**Architecture:** Part 1 rewrites `GmailService` to open an IMAP connection per-request using `imapflow`+`mailparser`, keeping identical public method signatures and response shapes. Part 2 replaces `backup-drive.js` with a new `backup-r2.js` script and rewrites `BackupsService` to use `@aws-sdk/client-s3` against Cloudflare R2; folder IDs are base64url-encoded S3 key prefixes to keep them URL-safe as route params.

**Tech Stack:** `imapflow` (IMAP client), `mailparser` (RFC 2822 parser), `@aws-sdk/client-s3` (S3-compatible R2 client). NestJS 11 + TypeORM backend, existing `ConfigService` for env vars.

---

## File Map

| File                                       | Action  | Responsibility                                                  |
| ------------------------------------------ | ------- | --------------------------------------------------------------- |
| `api/src/gmail/gmail.service.ts`           | Rewrite | IMAP-based inbox reading                                        |
| `api/src/gmail/gmail.controller.ts`        | Modify  | Remove OAuth setup endpoints + webhook controller               |
| `api/src/gmail/gmail.module.ts`            | Modify  | Remove `GmailWebhookController` registration                    |
| `api/scripts/backup-drive.js`              | Delete  | Replaced by backup-r2.js                                        |
| `api/scripts/backup-oauth-setup.js`        | Delete  | No longer needed                                                |
| `api/scripts/backup-r2.js`                 | Create  | Upload to R2, prune old automatic backups                       |
| `api/scripts/backup.sh`                    | Modify  | Update PM2_KEYS + script reference                              |
| `api/src/backups/backups.service.ts`       | Rewrite | R2-backed list/create/delete/restore                            |
| `api/src/backups/dto/backup-folder.dto.ts` | Modify  | Update DriveSpaceDto comments                                   |
| `api/package.json`                         | Modify  | Add imapflow, mailparser, @aws-sdk/client-s3; remove googleapis |

---

## Task 1: Install / remove packages

**Files:**

- Modify: `api/package.json`

- [ ] **Step 1: Install new dependencies**

```bash
cd api
npm install imapflow mailparser @aws-sdk/client-s3
npm install --save-dev @types/mailparser
```

Expected: packages added to `node_modules`, `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Remove googleapis**

```bash
npm uninstall googleapis google-auth-library
```

Expected: `googleapis` and `google-auth-library` removed from `package.json`.

- [ ] **Step 3: Verify build still starts**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build fails with import errors in `gmail.service.ts` and `backups.service.ts` — that is correct since we haven't rewritten them yet. Confirm the error is `Cannot find module 'googleapis'`, not something unrelated.

---

## Task 2: Rewrite GmailService with imapflow

**Files:**

- Modify: `api/src/gmail/gmail.service.ts`

The new service keeps the same public method signatures (`listEmails`, `getEmail`, `getAttachment`, `assertRsa`) but replaces all OAuth/googleapis internals with IMAP. The `OnModuleInit` lifecycle hook, Pub/Sub watch methods, and OAuth setup methods are all removed.

Pagination changes: `pageToken` was an opaque Google cursor string; now it is a 1-based page number as a string (e.g. `"1"`, `"2"`). `nextPageToken` in the response becomes the next page number string, or `undefined` when there are no more results. Frontend code that passes `pageToken` from the previous response will continue to work unchanged.

- [ ] **Step 1: Write failing test**

Create `api/src/gmail/gmail.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { GmailService } from "./gmail.service";
import { User } from "../users/entities/user.entity";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";

// Mock imapflow
const mockLock = { release: jest.fn() };
const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  getMailboxLock: jest.fn().mockResolvedValue(mockLock),
  search: jest.fn(),
  fetchOne: jest.fn(),
};
jest.mock("imapflow", () => ({
  ImapFlow: jest.fn().mockImplementation(() => mockClient),
}));

// Mock mailparser
jest.mock("mailparser", () => ({
  simpleParser: jest.fn(),
}));

import { simpleParser } from "mailparser";

describe("GmailService", () => {
  let service: GmailService;
  const rsaUser: Partial<User> = {
    id: "user-1",
    role: UserRole.MEMBER,
    rsa: true,
    ruolo: Ruolo.PILOT,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        GmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                GMAIL_USER_PILOT: "pilot@example.com",
                GMAIL_USER_CABIN_CREW: "cc@example.com",
                MAIL_PASS: "app-pass-pilot",
                GMAIL_APP_PASSWORD_CABIN_CREW: "app-pass-cc",
              };
              return map[key];
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(rsaUser),
          },
        },
      ],
    }).compile();
    service = module.get(GmailService);
  });

  describe("listEmails", () => {
    it("returns first page of emails sorted newest first", async () => {
      mockClient.search.mockResolvedValue([1, 2, 3]);
      mockClient.fetchOne.mockResolvedValue({
        envelope: {
          from: [{ name: "Alice", address: "alice@example.com" }],
          subject: "Hello",
          date: new Date("2026-01-01T10:00:00Z"),
        },
        flags: new Set<string>(),
      });

      const result = await service.listEmails("user-1");
      expect(result.emails).toHaveLength(3);
      expect(result.emails[0].from).toBe("Alice <alice@example.com>");
      expect(result.emails[0].unread).toBe(true);
      expect(result.nextPageToken).toBeUndefined();
    });

    it("returns nextPageToken when more results exist", async () => {
      mockClient.search.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => i + 1),
      );
      mockClient.fetchOne.mockResolvedValue({
        envelope: {
          from: [{ address: "a@b.com" }],
          subject: "X",
          date: new Date(),
        },
        flags: new Set<string>(["\\Seen"]),
      });

      const result = await service.listEmails("user-1");
      expect(result.emails).toHaveLength(20);
      expect(result.nextPageToken).toBe("2");
    });
  });

  describe("getEmail", () => {
    it("parses source email and returns structured detail", async () => {
      mockClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") });
      (simpleParser as jest.Mock).mockResolvedValue({
        from: { text: "Alice <alice@example.com>" },
        subject: "Test",
        date: new Date("2026-01-01T10:00:00Z"),
        html: "<p>Hello</p>",
        text: "Hello",
        attachments: [
          {
            filename: "doc.pdf",
            contentType: "application/pdf",
            size: 1024,
            content: Buffer.alloc(1024),
          },
        ],
      });

      const result = await service.getEmail("user-1", "42");
      expect(result.id).toBe("42");
      expect(result.bodyHtml).toBe("<p>Hello</p>");
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].attachmentId).toBe("0");
      expect(result.attachments[0].filename).toBe("doc.pdf");
    });
  });

  describe("getAttachment", () => {
    it("returns base64-encoded attachment content", async () => {
      const content = Buffer.from("PDF content");
      mockClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") });
      (simpleParser as jest.Mock).mockResolvedValue({
        attachments: [{ content, size: content.length }],
      });

      const result = await service.getAttachment("user-1", "42", "0");
      expect(result.data).toBe(content.toString("base64"));
      expect(result.size).toBe(content.length);
    });
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd api && npx jest src/gmail/gmail.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `GmailService` still imports `googleapis`.

- [ ] **Step 3: Rewrite gmail.service.ts**

Replace the entire file content:

```typescript
import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { User } from "../users/entities/user.entity";
import { Ruolo } from "../common/enums/ruolo.enum";
import { UserRole } from "../common/enums/user-role.enum";

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDetail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  bodyHtml: string | null;
  bodyText: string | null;
  attachments: EmailAttachment[];
}

export interface EmailListResult {
  emails: EmailSummary[];
  nextPageToken?: string;
}

const PAGE_SIZE = 20;

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ── IMAP client factory ────────────────────────────────────────────

  private getImapClient(ruolo: Ruolo): ImapFlow {
    const user =
      ruolo === Ruolo.PILOT
        ? this.configService.get<string>("GMAIL_USER_PILOT")!
        : this.configService.get<string>("GMAIL_USER_CABIN_CREW")!;

    const pass =
      ruolo === Ruolo.PILOT
        ? this.configService.get<string>("MAIL_PASS")!
        : this.configService.get<string>("GMAIL_APP_PASSWORD_CABIN_CREW")!;

    return new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });
  }

  private getGmailUserForRuolo(ruolo: Ruolo): string {
    return ruolo === Ruolo.PILOT
      ? this.configService.get<string>("GMAIL_USER_PILOT") || ""
      : this.configService.get<string>("GMAIL_USER_CABIN_CREW") || "";
  }

  // ── RSA gate ───────────────────────────────────────────────────────

  private async assertRsa(
    userId: string,
    ruoloOverride?: Ruolo,
  ): Promise<Ruolo> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException("User not found");

    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

    if (isAdmin) {
      if (!ruoloOverride)
        throw new ForbiddenException(
          "Admin must specify ruolo query param (pilot or cabin_crew)",
        );
      return ruoloOverride;
    }

    if (user.rsa !== true)
      throw new ForbiddenException("Access restricted to RSA members");
    if (!user.ruolo)
      throw new ForbiddenException(
        "RSA user has no professional role assigned",
      );
    return user.ruolo;
  }

  // ── Public API ─────────────────────────────────────────────────────

  async listEmails(
    userId: string,
    pageToken?: string,
    ruoloOverride?: Ruolo,
  ): Promise<EmailListResult> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const client = this.getImapClient(ruolo);
    const page = pageToken ? Math.max(1, parseInt(pageToken, 10)) : 1;

    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const uids = (await client.search({}, { uid: true })) as number[];
        uids.sort((a, b) => b - a); // newest first

        const start = (page - 1) * PAGE_SIZE;
        const pageUids = uids.slice(start, start + PAGE_SIZE);
        const hasMore = uids.length > start + PAGE_SIZE;

        const emails: EmailSummary[] = [];
        for (const uid of pageUids) {
          const msg = await client.fetchOne(
            String(uid),
            { envelope: true, flags: true },
            { uid: true },
          );
          if (!msg) continue;

          const f = msg.envelope.from?.[0];
          const from = f
            ? f.name
              ? `${f.name} <${f.address}>`
              : (f.address ?? "")
            : "";

          emails.push({
            id: String(uid),
            threadId: "",
            from,
            subject: msg.envelope.subject || "(no subject)",
            date: msg.envelope.date?.toISOString() ?? "",
            snippet: "",
            unread: !(msg.flags as Set<string>).has("\\Seen"),
          });
        }

        return {
          emails,
          nextPageToken: hasMore ? String(page + 1) : undefined,
        };
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`listEmails failed: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve emails");
    } finally {
      await client.logout();
    }
  }

  async getEmail(
    userId: string,
    messageId: string,
    ruoloOverride?: Ruolo,
  ): Promise<EmailDetail> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const client = this.getImapClient(ruolo);
    const uid = parseInt(messageId, 10);

    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const msg = await client.fetchOne(
          String(uid),
          { source: true },
          { uid: true },
        );
        if (!msg) throw new InternalServerErrorException("Email not found");

        const parsed = await simpleParser(msg.source as Buffer);

        const attachments: EmailAttachment[] = (parsed.attachments ?? []).map(
          (att, idx) => ({
            attachmentId: String(idx),
            filename: att.filename ?? `attachment-${idx}`,
            mimeType: att.contentType ?? "application/octet-stream",
            size: att.size ?? att.content.length,
          }),
        );

        return {
          id: String(uid),
          threadId: "",
          from: parsed.from?.text ?? "",
          subject: parsed.subject ?? "(no subject)",
          date: parsed.date?.toISOString() ?? "",
          bodyHtml: (parsed.html as string) || null,
          bodyText: parsed.text ?? null,
          attachments,
        };
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`getEmail ${messageId} failed: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve email");
    } finally {
      await client.logout();
    }
  }

  async getAttachment(
    userId: string,
    messageId: string,
    attachmentId: string,
    ruoloOverride?: Ruolo,
  ): Promise<{ data: string; size: number }> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const client = this.getImapClient(ruolo);
    const uid = parseInt(messageId, 10);
    const attIdx = parseInt(attachmentId, 10);

    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const msg = await client.fetchOne(
          String(uid),
          { source: true },
          { uid: true },
        );
        if (!msg) throw new InternalServerErrorException("Email not found");

        const parsed = await simpleParser(msg.source as Buffer);
        const att = parsed.attachments?.[attIdx];
        if (!att)
          throw new InternalServerErrorException("Attachment not found");

        return {
          data: att.content.toString("base64"),
          size: att.content.length,
        };
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`getAttachment failed: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve attachment");
    } finally {
      await client.logout();
    }
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd api && npx jest src/gmail/gmail.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add api/src/gmail/gmail.service.ts api/src/gmail/gmail.service.spec.ts
git commit -m "feat(gmail): replace OAuth with IMAP+App Password via imapflow"
```

---

## Task 3: Trim GmailController and GmailModule

**Files:**

- Modify: `api/src/gmail/gmail.controller.ts`
- Modify: `api/src/gmail/gmail.module.ts`

Remove the `GET /gmail/authorize`, `POST /gmail/authorize`, `GET /gmail/status` endpoints and the entire `GmailWebhookController` class. The three public inbox endpoints (`GET /gmail/inbox`, `GET /gmail/inbox/:id`, `GET /gmail/inbox/:id/attachment`) remain unchanged.

- [ ] **Step 1: Replace gmail.controller.ts**

```typescript
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Ruolo } from "../common/enums/ruolo.enum";
import { GmailService } from "./gmail.service";

@Controller("gmail")
@UseGuards(JwtAuthGuard)
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get("inbox")
  listEmails(
    @Req() req: any,
    @Query("pageToken") pageToken?: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.listEmails(
      req.user.userId,
      pageToken,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  @Get("inbox/:id")
  getEmail(
    @Req() req: any,
    @Param("id") id: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.getEmail(
      req.user.userId,
      id,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  @Get("inbox/:id/attachment")
  getAttachment(
    @Req() req: any,
    @Param("id") messageId: string,
    @Query("attachmentId") attachmentId: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.getAttachment(
      req.user.userId,
      messageId,
      attachmentId,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  private parseRuoloOptional(value: string): Ruolo | undefined {
    if (value === Ruolo.PILOT || value === Ruolo.CABIN_CREW)
      return value as Ruolo;
    return undefined;
  }
}
```

- [ ] **Step 2: Replace gmail.module.ts**

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entities/user.entity";
import { GmailService } from "./gmail.service";
import { GmailController } from "./gmail.controller";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [GmailService],
  controllers: [GmailController],
})
export class GmailModule {}
```

- [ ] **Step 3: Build to verify no compile errors**

```bash
cd api && npm run build 2>&1 | grep -E "error TS|Error:" | head -20
```

Expected: No TypeScript errors in the gmail module. There may still be errors in `backups.service.ts` (still has googleapis import) — that is expected and will be fixed in Task 6.

- [ ] **Step 4: Commit**

```bash
git add api/src/gmail/gmail.controller.ts api/src/gmail/gmail.module.ts
git commit -m "feat(gmail): remove OAuth setup endpoints and Pub/Sub webhook controller"
```

---

## Task 4: Create backup-r2.js

**Files:**

- Create: `api/scripts/backup-r2.js`
- Delete: `api/scripts/backup-drive.js`
- Delete: `api/scripts/backup-oauth-setup.js`

The script maintains the same CLI interface as `backup-drive.js`: `node backup-r2.js <tmpDir> <dateLabel> [backupType]`. It outputs `[backup-r2] Day folder "<prefix>"` so that `backups.service.ts`'s regex still matches.

- [ ] **Step 1: Create api/scripts/backup-r2.js**

```javascript
#!/usr/bin/env node
// backup-r2.js — Upload backup files to Cloudflare R2 and prune old automatic backups.
// Usage: node scripts/backup-r2.js <tmpDir> <dateLabel> [backupType]
//   tmpDir     — local directory containing files to upload
//   dateLabel  — subfolder name, e.g. "2026-04-04_2300"
//   backupType — "Automatic" (default) or "Manual"
//
// R2 object key structure:
//   {bucketName}/automatic/{dateLabel}/{filename}
//   {bucketName}/manual/{dateLabel}/{filename}
//
// Required env vars:
//   R2_ACCOUNT_ID      — Cloudflare account ID
//   R2_ACCESS_KEY_ID   — R2 API token access key
//   R2_SECRET_ACCESS_KEY — R2 API token secret
//   R2_BUCKET_NAME     — R2 bucket name

"use strict";

const fs = require("fs");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

// ---------------------------------------------------------------------------
// Args + config
// ---------------------------------------------------------------------------
const tmpDir = process.argv[2];
const dateLabel = process.argv[3];
const backupType = (process.argv[4] || "Automatic").toLowerCase();

if (!tmpDir || !dateLabel) {
  console.error(
    "[backup-r2] Usage: node backup-r2.js <tmpDir> <dateLabel> [backupType]",
  );
  process.exit(1);
}

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error(
    "[backup-r2] ERROR: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set.",
  );
  process.exit(1);
}
if (!bucketName) {
  console.error("[backup-r2] ERROR: R2_BUCKET_NAME is not set.");
  process.exit(1);
}

const RETENTION_DAYS = 15;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const folderPrefix = `${backupType}/${dateLabel}`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const files = fs
    .readdirSync(tmpDir)
    .filter((f) => fs.statSync(path.join(tmpDir, f)).isFile());

  if (files.length === 0) {
    console.error("[backup-r2] ERROR: No files found in tmpDir to upload.");
    process.exit(1);
  }

  for (const filename of files) {
    const filePath = path.join(tmpDir, filename);
    const key = `${folderPrefix}/${filename}`;
    await uploadFile(filePath, filename, key);
  }

  // This line is parsed by backups.service.ts to extract the folder name.
  console.log(`[backup-r2] Day folder "${folderPrefix}"`);

  if (backupType === "automatic") {
    await pruneOldBackups();
  } else {
    console.log(
      `[backup-r2] Type is "${backupType}" — skipping retention pruning.`,
    );
  }

  console.log("[backup-r2] All done.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function uploadFile(filePath, filename, key) {
  const fileSize = fs.statSync(filePath).size;
  console.log(
    `[backup-r2] Uploading ${filename} (${formatBytes(fileSize)})...`,
  );

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentLength: fileSize,
    }),
  );

  console.log(`[backup-r2]   ✓ ${filename} uploaded`);
}

async function pruneOldBackups() {
  const prefix = "automatic/";
  const folders = new Set();
  let continuationToken;

  // List virtual "folders" by using a delimiter
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      }),
    );
    for (const cp of res.CommonPrefixes || []) {
      if (cp.Prefix) folders.add(cp.Prefix);
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  // Extract date names, sort ascending (oldest first)
  const dateFolders = [...folders]
    .map((p) => String(p).replace(prefix, "").replace(/\/$/, ""))
    .filter((name) => /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(name))
    .sort();

  console.log(
    `[backup-r2] Found ${dateFolders.length} automatic backup folder(s).`,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const toDelete = dateFolders.filter((name) => {
    const [datePart] = name.split("_");
    return new Date(datePart) < cutoff;
  });

  if (toDelete.length === 0) {
    console.log(
      `[backup-r2] Retention OK (${dateFolders.length}/${RETENTION_DAYS}d) — nothing to delete.`,
    );
    return;
  }

  for (const name of toDelete) {
    await deleteFolder(`${prefix}${name}/`);
  }
  console.log(`[backup-r2] Pruned ${toDelete.length} old folder(s).`);
}

async function deleteFolder(folderKey) {
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: bucketName, Prefix: folderKey }),
  );
  const objects = (res.Contents || [])
    .filter((obj) => obj.Key)
    .map((obj) => ({ Key: obj.Key }));

  if (objects.length === 0) return;

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: objects },
    }),
  );
  console.log(
    `[backup-r2] Deleted ${objects.length} object(s) in ${folderKey}`,
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error("[backup-r2] FATAL:", err.message || err);
  process.exit(1);
});
```

- [ ] **Step 2: Delete old scripts**

```bash
rm api/scripts/backup-drive.js api/scripts/backup-oauth-setup.js
```

- [ ] **Step 3: Make script executable**

```bash
chmod +x api/scripts/backup-r2.js
```

- [ ] **Step 4: Commit**

```bash
git add api/scripts/backup-r2.js
git rm api/scripts/backup-drive.js api/scripts/backup-oauth-setup.js
git commit -m "feat(backups): replace backup-drive.js with backup-r2.js (Cloudflare R2)"
```

---

## Task 5: Update backup.sh

**Files:**

- Modify: `api/scripts/backup.sh`

Two changes: update `PM2_KEYS` to include R2 env vars instead of Google Drive vars, and change the script invocation from `backup-drive.js` to `backup-r2.js`.

- [ ] **Step 1: Update PM2_KEYS line**

Find:

```bash
PM2_KEYS="DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_DATABASE UPLOAD_BASE_DIR GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET BACKUP_DRIVE_REFRESH_TOKEN BACKUP_DRIVE_FOLDER_ID"
```

Replace with:

```bash
PM2_KEYS="DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_DATABASE UPLOAD_BASE_DIR R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME"
```

- [ ] **Step 2: Update comment + script invocation**

Find:

```bash
echo "[backup] BACKUP_SERVICE_ACCOUNT_PATH=${BACKUP_SERVICE_ACCOUNT_PATH:-<not set>}"
echo "[backup] BACKUP_DRIVE_FOLDER_ID=${BACKUP_DRIVE_FOLDER_ID:-<not set>}"
echo "[backup] Uploading to Google Drive..."
BACKUP_TYPE="${BACKUP_TYPE:-Automatic}"
echo "[backup] Backup type: $BACKUP_TYPE"
node "$SCRIPT_DIR/backup-drive.js" "$TMP_DIR" "$DATE_LABEL" "$BACKUP_TYPE"
```

Replace with:

```bash
echo "[backup] R2_BUCKET_NAME=${R2_BUCKET_NAME:-<not set>}"
echo "[backup] Uploading to Cloudflare R2..."
BACKUP_TYPE="${BACKUP_TYPE:-Automatic}"
echo "[backup] Backup type: $BACKUP_TYPE"
node "$SCRIPT_DIR/backup-r2.js" "$TMP_DIR" "$DATE_LABEL" "$BACKUP_TYPE"
```

- [ ] **Step 3: Commit**

```bash
git add api/scripts/backup.sh
git commit -m "feat(backups): update backup.sh to use R2 env vars and backup-r2.js"
```

---

## Task 6: Rewrite BackupsService for R2

**Files:**

- Modify: `api/src/backups/backups.service.ts`
- Modify: `api/src/backups/dto/backup-folder.dto.ts`

**Key design decisions:**

- `BackupFolderDto.id` is a **base64url-encoded** S3 key prefix (e.g. `automatic/2026-01-15_2300` → `YXV0b21hdGljLzIwMjYtMDEtMTVfMjMwMA`). This keeps it URL-safe as a `DELETE /backups/:folderId` route parameter.
- `DriveSpaceDto` is kept for API compatibility but `total` and `used` are always `0` (R2 has no quota API).
- `createdTime` is derived from the folder name `YYYY-MM-DD_HHMM` since R2 has no folder creation timestamps.
- The safety check in `deleteBackup`/`restoreBackup` validates the decoded prefix matches `^(automatic|manual)/\d{4}-\d{2}-\d{2}_\d{4}$` instead of the old 2-hop Drive parent check.

- [ ] **Step 1: Write failing tests**

Create `api/src/backups/backups.service.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { BackupsService } from "./backups.service";

// Mock @aws-sdk/client-s3
const mockSend = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  ListObjectsV2Command: jest.fn((input) => ({ _input: input })),
  PutObjectCommand: jest.fn((input) => ({ _input: input })),
  DeleteObjectsCommand: jest.fn((input) => ({ _input: input })),
  GetObjectCommand: jest.fn((input) => ({ _input: input })),
}));

// Mock child_process for restore tests
jest.mock("child_process", () => ({
  spawn: jest.fn(),
  execSync: jest.fn(),
}));

// Mock stream/promises pipeline
jest.mock("stream/promises", () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

const b64 = (s: string) => Buffer.from(s).toString("base64url");

describe("BackupsService", () => {
  let service: BackupsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BackupsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                R2_ACCOUNT_ID: "acc123",
                R2_ACCESS_KEY_ID: "key123",
                R2_SECRET_ACCESS_KEY: "secret123",
                R2_BUCKET_NAME: "unionhub-backups",
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();
    service = module.get(BackupsService);
  });

  describe("listBackups", () => {
    it("returns automatic and manual folders with base64url ids", async () => {
      mockSend
        // automatic/ common prefixes
        .mockResolvedValueOnce({
          CommonPrefixes: [{ Prefix: "automatic/2026-01-15_2300/" }],
          NextContinuationToken: undefined,
        })
        // manual/ common prefixes
        .mockResolvedValueOnce({
          CommonPrefixes: [],
          NextContinuationToken: undefined,
        })
        // files inside automatic/2026-01-15_2300/
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
        });

      const result = await service.listBackups();
      expect(result.automatic).toHaveLength(1);
      expect(result.automatic[0].id).toBe(b64("automatic/2026-01-15_2300"));
      expect(result.automatic[0].name).toBe("2026-01-15_2300");
      expect(result.automatic[0].files).toHaveLength(2);
      expect(result.automatic[0].totalSize).toBe(3072);
      expect(result.manual).toHaveLength(0);
      expect(result.driveSpace.backupSize).toBe(3072);
    });
  });

  describe("deleteBackup", () => {
    it("deletes objects matching the decoded prefix", async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: "automatic/2026-01-15_2300/db.sql.gz" },
          { Key: "automatic/2026-01-15_2300/uploads.tar.gz" },
        ],
      });
      mockSend.mockResolvedValueOnce({}); // DeleteObjectsCommand response

      const folderId = b64("automatic/2026-01-15_2300");
      await expect(service.deleteBackup(folderId)).resolves.toBeUndefined();
    });

    it("throws NotFoundException for invalid/tampered id", async () => {
      const badId = b64("../../etc/passwd");
      await expect(service.deleteBackup(badId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when no objects found", async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] });
      const folderId = b64("automatic/2026-01-15_2300");
      await expect(service.deleteBackup(folderId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd api && npx jest src/backups/backups.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `BackupsService` still imports `googleapis`.

- [ ] **Step 3: Update backup-folder.dto.ts**

Replace file content (only comment update, all class shapes preserved):

```typescript
export class BackupFileDto {
  id: string;
  name: string;
  size: number;
}

export class BackupFolderDto {
  /** Base64url-encoded S3 key prefix, e.g. base64url("automatic/2026-01-15_2300") */
  id: string;
  name: string;
  type: "automatic" | "manual";
  createdTime: string;
  files: BackupFileDto[];
  totalSize: number;
}

export class DriveSpaceDto {
  /** Always 0 — Cloudflare R2 has no quota API */
  total: number;
  /** Always 0 — Cloudflare R2 has no quota API */
  used: number;
  /** Bytes used by all backup files in the bucket */
  backupSize: number;
}

export class BackupsListDto {
  automatic: BackupFolderDto[];
  manual: BackupFolderDto[];
  driveSpace: DriveSpaceDto;
}
```

- [ ] **Step 4: Rewrite backups.service.ts**

Replace the entire file:

```typescript
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
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
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

const SUBFOLDER_AUTOMATIC = "automatic";
const SUBFOLDER_MANUAL = "manual";
const VALID_PREFIX = /^(automatic|manual)\/\d{4}-\d{2}-\d{2}_\d{4}$/;

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private isBackupRunning = false;

  constructor(private readonly configService: ConfigService) {}

  // ── S3 client ──────────────────────────────────────────────────────

  private getS3Client(): S3Client {
    const accountId = this.configService.get<string>("R2_ACCOUNT_ID");
    const accessKeyId = this.configService.get<string>("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>(
      "R2_SECRET_ACCESS_KEY",
    );

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        "Cloudflare R2 credentials not configured",
      );
    }

    return new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private getBucketName(): string {
    const name = this.configService.get<string>("R2_BUCKET_NAME");
    if (!name)
      throw new InternalServerErrorException("R2_BUCKET_NAME not configured");
    return name;
  }

  // ── ID encoding ────────────────────────────────────────────────────

  private encodeId(prefix: string): string {
    return Buffer.from(prefix).toString("base64url");
  }

  private decodeId(id: string): string {
    return Buffer.from(id, "base64url").toString();
  }

  // ── Listing helpers ────────────────────────────────────────────────

  private parseDateFromName(name: string): string {
    const [datePart, timePart] = name.split("_");
    const hours = timePart.slice(0, 2);
    const minutes = timePart.slice(2);
    return new Date(`${datePart}T${hours}:${minutes}:00Z`).toISOString();
  }

  private async listFoldersByPrefix(
    s3: S3Client,
    bucket: string,
    prefix: string,
    type: "automatic" | "manual",
  ): Promise<BackupFolderDto[]> {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: "/",
      }),
    );

    const folders: BackupFolderDto[] = [];

    for (const cp of res.CommonPrefixes ?? []) {
      if (!cp.Prefix) continue;
      const name = cp.Prefix.replace(prefix, "").replace(/\/$/, "");
      if (!/^\d{4}-\d{2}-\d{2}_\d{4}$/.test(name)) continue;

      const filesRes = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: cp.Prefix }),
      );

      const files: BackupFileDto[] = (filesRes.Contents ?? [])
        .filter((obj) => obj.Key && obj.Key !== cp.Prefix)
        .map((obj) => ({
          id: obj.Key!,
          name: path.basename(obj.Key!),
          size: obj.Size ?? 0,
        }));

      const rawPrefix = cp.Prefix.replace(/\/$/, "");

      folders.push({
        id: this.encodeId(rawPrefix),
        name,
        type,
        createdTime: this.parseDateFromName(name),
        files,
        totalSize: files.reduce((acc, f) => acc + f.size, 0),
      });
    }

    return folders.sort((a, b) => b.name.localeCompare(a.name));
  }

  // ── Public API ─────────────────────────────────────────────────────

  async listBackups(): Promise<BackupsListDto> {
    const s3 = this.getS3Client();
    const bucket = this.getBucketName();

    const [automatic, manual] = await Promise.all([
      this.listFoldersByPrefix(
        s3,
        bucket,
        `${SUBFOLDER_AUTOMATIC}/`,
        "automatic",
      ),
      this.listFoldersByPrefix(s3, bucket, `${SUBFOLDER_MANUAL}/`, "manual"),
    ]);

    const backupSize = [...automatic, ...manual].reduce(
      (acc, f) => acc + f.totalSize,
      0,
    );

    const driveSpace: DriveSpaceDto = { total: 0, used: 0, backupSize };
    return { automatic, manual, driveSpace };
  }

  async deleteBackup(folderId: string): Promise<void> {
    const prefix = this.decodeAndValidate(folderId);
    const s3 = this.getS3Client();
    const bucket = this.getBucketName();

    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/` }),
    );

    const objects = (res.Contents ?? [])
      .filter((obj) => obj.Key)
      .map((obj) => ({ Key: obj.Key! }));

    if (objects.length === 0) throw new NotFoundException("Backup not found");

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

    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/` }),
    );
    const s3Files = res.Contents ?? [];

    const dbObj = s3Files.find((f) => f.Key?.match(/\/db_.*\.sql\.gz$/));
    if (!dbObj)
      throw new NotFoundException(
        "No database dump found in this backup folder",
      );

    const uploadsObj = s3Files.find((f) =>
      f.Key?.match(/\/uploads_.*\.tar\.gz$/),
    );

    const ts = Date.now();
    const tmpDbGz = path.join(os.tmpdir(), `uc-restore-${ts}.sql.gz`);
    const tmpDbSql = path.join(os.tmpdir(), `uc-restore-${ts}.sql`);
    const tmpUploadsGz = uploadsObj
      ? path.join(os.tmpdir(), `uc-restore-${ts}-uploads.tar.gz`)
      : null;

    try {
      // Download and restore DB
      const dlDb = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: dbObj.Key! }),
      );
      await pipeline(
        dlDb.Body as NodeJS.ReadableStream,
        createWriteStream(tmpDbGz),
      );
      await pipeline(
        createReadStream(tmpDbGz),
        createGunzip(),
        createWriteStream(tmpDbSql),
      );

      const host = this.configService.get("DB_HOST") ?? "localhost";
      const port = this.configService.get("DB_PORT") ?? "5432";
      const user = this.configService.get("DB_USERNAME") ?? "postgres";
      const password = this.configService.get("DB_PASSWORD") ?? "";
      const dbName = this.configService.get("DB_DATABASE") ?? "unionhub";
      const env = { ...process.env, PGPASSWORD: password };

      execSync(
        `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`,
        { env },
      );
      execSync(
        `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -f ${tmpDbSql}`,
        { env },
      );

      // Download and restore uploads
      if (uploadsObj && tmpUploadsGz) {
        const uploadBaseDir =
          this.configService.get<string>("UPLOAD_BASE_DIR") ??
          path.resolve(__dirname, "../../../uploads");

        const dlUploads = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: uploadsObj.Key! }),
        );
        await pipeline(
          dlUploads.Body as NodeJS.ReadableStream,
          createWriteStream(tmpUploadsGz),
        );

        execSync(`rm -rf "${uploadBaseDir}"`);
        fs.mkdirSync(path.dirname(uploadBaseDir), { recursive: true });
        execSync(
          `tar -xzf "${tmpUploadsGz}" -C "${path.dirname(uploadBaseDir)}"`,
        );
      }

      return {
        message: uploadsObj
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

  // ── Private helpers ────────────────────────────────────────────────

  private decodeAndValidate(folderId: string): string {
    let prefix: string;
    try {
      prefix = this.decodeId(folderId);
    } catch {
      throw new NotFoundException("Backup not found");
    }
    if (!VALID_PREFIX.test(prefix))
      throw new NotFoundException("Backup not found");
    return prefix;
  }
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd api && npx jest src/backups/backups.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 6: Full build check**

```bash
cd api && npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add api/src/backups/backups.service.ts api/src/backups/dto/backup-folder.dto.ts api/src/backups/backups.service.spec.ts
git commit -m "feat(backups): replace Google Drive with Cloudflare R2 via @aws-sdk/client-s3"
```

---

## Task 7: Update env files and clean up

**Files:**

- Modify: `api/.env.example` (or equivalent)

Update the example env file to reflect removed and added variables.

- [ ] **Step 1: Find the env example file**

```bash
ls api/.env* api/env* 2>/dev/null
```

- [ ] **Step 2: Remove old Google vars, add new ones**

Remove these lines (if present):

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN_PILOT=
GOOGLE_REFRESH_TOKEN_CABIN_CREW=
BACKUP_DRIVE_REFRESH_TOKEN=
BACKUP_DRIVE_FOLDER_ID=
GOOGLE_PUBSUB_TOPIC=
```

Add these lines in the appropriate sections:

```env
# Gmail IMAP (replaces Google OAuth)
# MAIL_PASS already serves as the pilot mailbox App Password (same Gmail account as SMTP)
GMAIL_APP_PASSWORD_CABIN_CREW=xxxx xxxx xxxx xxxx

# Cloudflare R2 Backups (replaces Google Drive)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=unionhub-backups
```

- [ ] **Step 3: Update CLAUDE.md env section**

In `api/` CLAUDE.md environment section, replace Drive/OAuth vars with R2 vars and note that `MAIL_PASS` doubles as the pilot IMAP password.

- [ ] **Step 4: Commit**

```bash
git add api/.env.example
git commit -m "docs: update env example for R2 and IMAP (remove Google OAuth vars)"
```

---

## Verification Checklist

### Gmail IMAP

- [ ] Generate App Password for cabin crew Gmail account: Google Account → Security → 2-Step Verification → App passwords
- [ ] Add `GMAIL_APP_PASSWORD_CABIN_CREW=xxxx xxxx xxxx xxxx` to `api/.env`
- [ ] `cd api && npm run start:dev` — no startup errors
- [ ] `GET /gmail/inbox?ruolo=pilot` (as RSA pilot or Admin) → returns email list
- [ ] `GET /gmail/inbox/:id?ruolo=pilot` → returns email detail with body
- [ ] `GET /gmail/inbox/:id/attachment?attachmentId=0&ruolo=pilot` → returns base64 data
- [ ] Confirm `GET /gmail/authorize` returns 404 (endpoint removed)
- [ ] Confirm no `googleapis` errors in logs

### Cloudflare R2

- [ ] Create R2 bucket `unionhub-backups` in Cloudflare dashboard
- [ ] Create R2 API token with `Edit` permission → get Account ID, Access Key ID, Secret
- [ ] Add R2 vars to `api/.env`
- [ ] `POST /backups` (SuperAdmin) → returns `{ message: "Backup completed successfully", folder: "manual/..." }`
- [ ] `GET /backups` → lists the new backup with base64url id
- [ ] Files appear in Cloudflare R2 dashboard under `manual/`
- [ ] `DELETE /backups/:folderId` → 204 No Content, files gone from R2
- [ ] `POST /backups/:folderId/restore` on a test DB → DB restored, uploads extracted
