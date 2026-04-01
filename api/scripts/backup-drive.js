#!/usr/bin/env node
// backup-drive.js — Upload backup files to Google Drive and prune old backups
// Usage: node scripts/backup-drive.js <tmpDir> <dateLabel>
//   tmpDir    — local directory containing files to upload
//   dateLabel — folder name on Drive, e.g. "2025-12-31"
//
// Required env vars:
//   GOOGLE_CLIENT_ID           — OAuth2 client ID (same as Gmail)
//   GOOGLE_CLIENT_SECRET       — OAuth2 client secret (same as Gmail)
//   BACKUP_DRIVE_REFRESH_TOKEN — Drive-scoped refresh token (run backup-oauth-setup.js once)
//   BACKUP_DRIVE_FOLDER_ID     — ID of the parent Drive folder to write into

"use strict";

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const tmpDir = process.argv[2];
const dateLabel = process.argv[3];

if (!tmpDir || !dateLabel) {
  console.error(
    "[backup-drive] Usage: node backup-drive.js <tmpDir> <dateLabel>",
  );
  process.exit(1);
}

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.BACKUP_DRIVE_REFRESH_TOKEN;
const parentFolderId = process.env.BACKUP_DRIVE_FOLDER_ID;

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
if (!parentFolderId) {
  console.error("[backup-drive] ERROR: BACKUP_DRIVE_FOLDER_ID is not set.");
  process.exit(1);
}

// Retention: keep last N daily backup folders
const RETENTION_DAYS = 7;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Authenticate with OAuth2 (same client as Gmail, Drive-scoped refresh token)
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: "v3", auth });

  // 1. Create (or reuse) a dated subfolder inside the parent folder
  const dayFolderId = await getOrCreateFolder(drive, dateLabel, parentFolderId);
  console.log(`[backup-drive] Day folder "${dateLabel}" id: ${dayFolderId}`);

  // 2. Upload all files from tmpDir
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

  // 3. Prune backup folders older than RETENTION_DAYS
  await pruneOldBackups(drive, parentFolderId);

  console.log("[backup-drive] All done.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrCreateFolder(drive, name, parentId) {
  // Check if a folder with this name already exists under parentId
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create it
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

async function pruneOldBackups(drive, parentFolderId) {
  // List all subfolders of the parent, sorted by name (YYYY-MM-DD → alphabetical = chronological)
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
    fields: "files(id, name, createdTime)",
    orderBy: "name asc",
    spaces: "drive",
    pageSize: 100,
  });

  const folders = (res.data.files || []).filter((f) =>
    // Only consider folders named like YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}$/.test(f.name),
  );

  console.log(`[backup-drive] Found ${folders.length} dated backup folder(s).`);

  if (folders.length <= RETENTION_DAYS) {
    console.log(`[backup-drive] Retention OK — nothing to delete.`);
    return;
  }

  // Folders are sorted oldest-first; delete everything beyond the last RETENTION_DAYS
  const toDelete = folders.slice(0, folders.length - RETENTION_DAYS);
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
