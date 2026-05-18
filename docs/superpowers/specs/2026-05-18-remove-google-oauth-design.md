# Remove Google OAuth Dependency

**Date:** 2026-05-18  
**Status:** Approved

## Context

Two systems use Google OAuth refresh tokens: Gmail inbox reading (`gmail.service.ts`) and database backups (`backup-drive.js`). Both suffer from unstable refresh tokens that break unpredictably — most likely because the OAuth app is in Google Cloud "Testing" mode (7-day token expiry) or tokens are revoked due to account security events.

Rather than chase the root cause, the fix is to eliminate OAuth entirely:

- Gmail reading → IMAP + App Password (same auth model already used by `mail.service.ts` for outgoing email)
- Backups → Cloudflare R2 (S3-compatible, static API keys, no OAuth)

---

## Part 1: Gmail Mailbox Reading → IMAP + imapflow

### Files Changed

| File                                | Change                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `api/src/gmail/gmail.service.ts`    | Full rewrite using `imapflow`                                            |
| `api/src/gmail/gmail.controller.ts` | Remove OAuth endpoints (`GET /gmail/authorize`, `POST /gmail/authorize`) |
| `api/package.json`                  | Add `imapflow`, `mailparser`, remove `googleapis` (if no other usage)    |

### Environment Variables

| Remove                            | Add                             |
| --------------------------------- | ------------------------------- |
| `GOOGLE_REFRESH_TOKEN_PILOT`      | `GMAIL_APP_PASSWORD_PILOT`      |
| `GOOGLE_REFRESH_TOKEN_CABIN_CREW` | `GMAIL_APP_PASSWORD_CABIN_CREW` |
| `GOOGLE_PUBSUB_TOPIC`             | —                               |
| `GOOGLE_CLIENT_ID`                | —                               |
| `GOOGLE_CLIENT_SECRET`            | —                               |

`GMAIL_USER_PILOT` and `GMAIL_USER_CABIN_CREW` remain unchanged.

### IMAP Connection

```typescript
const client = new ImapFlow({
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER_PILOT,
    pass: process.env.GMAIL_APP_PASSWORD_PILOT,
  },
  logger: false,
});
```

- Per-request connection lifecycle: `await client.connect()` → use → `await client.logout()`
- App Password: 16-char static string generated in Google Account > Security > App passwords. Never expires. Works even with 2FA.

### API Method Mapping

| Current (Gmail API)                      | New (IMAP)                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `listEmails(role, page)`                 | `client.search({}, { uid: true })` → sort desc → slice by page → `client.fetchOne()` per UID for headers |
| `getEmail(role, messageId)`              | `client.fetchOne(uid, { source: true })` → parse with `mailparser`                                       |
| `getAttachment(role, messageId, partId)` | `client.fetchOne(uid, { bodyParts: [partId] })`                                                          |

Use `mailparser` (`@types/mailparser` + `mailparser`) to parse raw RFC 2822 messages into structured objects (from, subject, date, html, text, attachments).

### What Is Lost

- **Pub/Sub webhook** (`POST /gmail/webhook`): real-time new-message push notifications to RSA users. Replaced by on-demand fetch when the user opens the mailbox screen. No silent push broadcast on new mail.
- **SuperAdmin authorize flow**: no longer needed.

---

## Part 2: Backups → Cloudflare R2

### Files Changed

| File                                 | Change                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| `api/scripts/backup-drive.js`        | Rewrite as `backup-r2.js` using `@aws-sdk/client-s3`             |
| `api/scripts/backup-oauth-setup.js`  | Delete                                                           |
| `api/scripts/backup.sh`              | Update script reference from `backup-drive.js` to `backup-r2.js` |
| `api/src/backups/backups.service.ts` | Update script invocation and list/delete/restore logic for R2    |
| `api/package.json`                   | Add `@aws-sdk/client-s3`                                         |

### Environment Variables

| Remove                       | Add                    |
| ---------------------------- | ---------------------- |
| `BACKUP_DRIVE_REFRESH_TOKEN` | `R2_ACCOUNT_ID`        |
| `BACKUP_DRIVE_FOLDER_ID`     | `R2_ACCESS_KEY_ID`     |
| —                            | `R2_SECRET_ACCESS_KEY` |
| —                            | `R2_BUCKET_NAME`       |

### S3 Client Configuration

```javascript
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
```

### Object Key Structure

Mirrors current Drive folder structure:

```
automatic/2025-01-15_2300/db.sql.gz
automatic/2025-01-15_2300/uploads.tar.gz
manual/2025-01-15_1430/db.sql.gz
manual/2025-01-15_1430/uploads.tar.gz
```

### Operations

| Operation            | S3 Command                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| Upload               | `PutObjectCommand` with `fs.createReadStream()` body                   |
| List backups         | `ListObjectsV2Command` with prefix `automatic/` or `manual/`           |
| Delete backup        | `DeleteObjectsCommand` for all keys with the folder prefix             |
| Download for restore | `GetObjectCommand` → pipe to local file                                |
| Retention (15 days)  | List `automatic/` → parse timestamp from key → delete if > 15 days old |

### REST API Endpoints — No Change

`GET /backups`, `POST /backups`, `DELETE /backups/:folderId`, `POST /backups/:folderId/restore` keep the same interface. Only the underlying storage driver changes.

### Cloudflare R2 One-Time Setup (Manual)

1. Go to `dash.cloudflare.com` → R2 → Create bucket (e.g. `unionhub-backups`)
2. R2 > Manage R2 API Tokens → Create token with `Edit` permission on the bucket
3. Copy Account ID, Access Key ID, Secret Access Key to `api/.env`
4. Free tier: 10 GB storage, 1M Class A ops/month, 10M Class B ops/month, no egress fees

---

## Verification

### Gmail IMAP

1. Generate App Password: Google Account → Security → 2-Step Verification → App passwords → select "Mail" + device name
2. Add to `.env`: `GMAIL_APP_PASSWORD_PILOT=xxxx xxxx xxxx xxxx`
3. `cd api && npm run start:dev`
4. Open union mailbox in mobile app → emails load correctly
5. Open email detail → body and attachments render
6. Confirm no OAuth errors in logs

### Cloudflare R2

1. Create R2 bucket + API token in Cloudflare dashboard
2. Add env vars to `api/.env`
3. `POST /backups` (manual backup) → returns success
4. `GET /backups` → lists the new backup entry
5. Verify files appear in Cloudflare R2 dashboard
6. `POST /backups/:folderId/restore` (on a test environment) → DB restored correctly
7. Wait 16 days or manually trigger retention logic → old automatic backups deleted
