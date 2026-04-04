#!/usr/bin/env node
// backup-drive.js — Upload backup files to Google Drive and prune old backups
// Usage: node scripts/backup-drive.js <tmpDir> <dateLabel> [backupType]
//   tmpDir     — local directory containing files to upload
//   dateLabel  — folder name on Drive, e.g. "2026-04-04_2300"
//   backupType — "Automatic" (default) or "Manual"
//
// Drive structure:
//   BACKUP_DRIVE_FOLDER_ID/
//     Automatic/  ← cron backups, retention RETENTION_AUTOMATIC
//     Manual/     ← on-demand backups, no auto-deletion
//
// Required env vars:
//   GOOGLE_CLIENT_ID           — OAuth2 client ID (same as Gmail)
//   GOOGLE_CLIENT_SECRET       — OAuth2 client secret (same as Gmail)
//   BACKUP_DRIVE_REFRESH_TOKEN — Drive-scoped refresh token (run backup-oauth-setup.js once)
//   BACKUP_DRIVE_FOLDER_ID     — ID of the root backup folder on Drive

"use strict";

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const tmpDir = process.argv[2];
const dateLabel = process.argv[3];
const backupType = process.argv[4] || "Automatic";

if (!tmpDir || !dateLabel) {
  console.error(
    "[backup-drive] Usage: node backup-drive.js <tmpDir> <dateLabel> [backupType]",
  );
  process.exit(1);
}

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.BACKUP_DRIVE_REFRESH_TOKEN;
const rootFolderId = process.env.BACKUP_DRIVE_FOLDER_ID;

if (!clientId || !clientSecret) {
  console.error(
    "[backup-drive] ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set.",
  );
  process.exit(1);
}
if (!refreshToken) {
  console.error(
    "[backup-drive] ERROR: BACKUP_DRIVE_REFRESH_TOKEN is not set.\n" +
      "  Run: node scripts/backup-oauth-setup.js",
  );
  process.exit(1);
}
if (!rootFolderId) {
  console.error("[backup-drive] ERROR: BACKUP_DRIVE_FOLDER_ID is not set.");
  process.exit(1);
}

// Retention for Automatic backups only (Manual backups are never auto-deleted)
const RETENTION_AUTOMATIC = 15;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: "v3", auth });

  // 1. Get or create the type subfolder (Automatic / Manual)
  const typeFolderId = await getOrCreateFolder(drive, backupType, rootFolderId);
  console.log(`[backup-drive] Type folder "${backupType}" id: ${typeFolderId}`);

  // 2. Create (or reuse) a dated subfolder inside the type folder
  const dayFolderId = await getOrCreateFolder(drive, dateLabel, typeFolderId);
  console.log(`[backup-drive] Day folder "${dateLabel}" id: ${dayFolderId}`);

  // 3. Upload all files from tmpDir
  const files = fs.readdirSync(tmpDir).filter((f) => {
    const full = path.join(tmpDir, f);
    return fs.statSync(full).isFile();
  });

  if (files.length === 0) {
    console.error("[backup-drive] ERROR: No files found in tmpDir to upload.");
    process.exit(1);
  }

  for (const filename of files) {
    const filePath = path.join(tmpDir, filename);
    await uploadFile(drive, filePath, filename, dayFolderId);
  }

  // 4. Prune old backups (Automatic only)
  if (backupType === "Automatic") {
    await pruneOldBackups(drive, typeFolderId, RETENTION_AUTOMATIC);
  } else {
    console.log(
      `[backup-drive] Type is "${backupType}" — skipping retention pruning.`,
    );
  }

  console.log("[backup-drive] All done.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrCreateFolder(drive, name, parentId) {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  return created.data.id;
}

async function uploadFile(drive, filePath, filename, folderId) {
  const mimeType = filename.endsWith(".gz")
    ? "application/gzip"
    : "application/octet-stream";
  const fileSize = fs.statSync(filePath).size;

  console.log(
    `[backup-drive] Uploading ${filename} (${formatBytes(fileSize)})...`,
  );

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: "id, name, size",
  });

  console.log(
    `[backup-drive]   ✓ ${res.data.name} uploaded (id: ${res.data.id})`,
  );
}

async function pruneOldBackups(drive, typeFolderId, retention) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${typeFolderId}' in parents and trashed=false`,
    fields: "files(id, name, createdTime)",
    orderBy: "name asc",
    spaces: "drive",
    pageSize: 200,
  });

  const folders = (res.data.files || []).filter((f) =>
    /^\d{4}-\d{2}-\d{2}_\d{4}$/.test(f.name),
  );

  console.log(
    `[backup-drive] Found ${folders.length} dated backup folder(s) in Automatic.`,
  );

  if (folders.length <= retention) {
    console.log(
      `[backup-drive] Retention OK (${folders.length}/${retention}) — nothing to delete.`,
    );
    return;
  }

  const toDelete = folders.slice(0, folders.length - retention);
  for (const folder of toDelete) {
    console.log(
      `[backup-drive] Deleting old backup folder: ${folder.name} (${folder.id})`,
    );
    await drive.files.delete({ fileId: folder.id });
  }
  console.log(`[backup-drive] Pruned ${toDelete.length} old folder(s).`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error("[backup-drive] FATAL:", err.message || err);
  process.exit(1);
});
