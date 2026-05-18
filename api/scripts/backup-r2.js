#!/usr/bin/env node
// backup-r2.js — Upload backup files to Cloudflare R2 and prune old automatic backups.
// Usage: node scripts/backup-r2.js <tmpDir> <dateLabel> [backupType]
//   tmpDir     — local directory containing files to upload
//   dateLabel  — subfolder name, e.g. "2026-04-04_2300"
//   backupType — "Automatic" (default) or "Manual"
//
// R2 object key structure:
//   automatic/{dateLabel}/{filename}
//   manual/{dateLabel}/{filename}
//
// Required env vars:
//   R2_ACCOUNT_ID        — Cloudflare account ID
//   R2_ACCESS_KEY_ID     — R2 API token access key
//   R2_SECRET_ACCESS_KEY — R2 API token secret
//   R2_BUCKET_NAME       — R2 bucket name

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

  // Parsed by backups.service.ts to extract the folder name.
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
