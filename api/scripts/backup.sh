#!/usr/bin/env bash
# backup.sh — UnionConnect daily backup: PostgreSQL dump + uploads archive
# Usage: bash scripts/backup.sh [path/to/.env]
#
# Env resolution order:
#   1. PM2 process environment (if pm2 is running and the app is found)
#   2. .env file (path as first argument, default: <script-root>/../.env)
#
# Crontab example (23:00 every day):
#   0 23 * * * cd /home/cleavr/api.unionhub.app/current && bash scripts/backup.sh >> /var/log/unionhub-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# PM2 app name (must match the "name" field in your ecosystem / pm2 config)
PM2_APP_NAME="${PM2_APP_NAME:-api.unionhub.app}"

# Env vars to extract from PM2 (everything backup.sh needs)
PM2_KEYS="DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_DATABASE UPLOAD_BASE_DIR GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET BACKUP_DRIVE_REFRESH_TOKEN BACKUP_DRIVE_FOLDER_ID"

# ---------------------------------------------------------------------------
# 1. Try to load env from PM2
# ---------------------------------------------------------------------------
PM2_LOADED=false

if command -v pm2 &>/dev/null; then
  PM2_JSON="$(pm2 jlist 2>/dev/null || true)"

  if [[ -n "$PM2_JSON" ]]; then
    # Use inline Node.js to extract KEY=VALUE lines for the target app
    PM2_EXPORTS="$(node -e "
      try {
        const procs = JSON.parse(process.argv[1]);
        const proc = procs.find(p => p.name === process.argv[2]);
        if (!proc) { process.exit(1); }
        const env = proc.pm2_env || {};
        process.argv[3].split(' ').forEach(k => {
          if (k && env[k] !== undefined && env[k] !== '') {
            // Escape single quotes in the value
            const v = String(env[k]).replace(/'/g, \"'\\\\'\");
            console.log(k + \"='\" + v + \"'\");
          }
        });
      } catch(e) { process.exit(1); }
    " "$PM2_JSON" "$PM2_APP_NAME" "$PM2_KEYS" 2>/dev/null || true)"

    if [[ -n "$PM2_EXPORTS" ]]; then
      eval "$PM2_EXPORTS"
      PM2_LOADED=true
      echo "[backup] Env loaded from PM2 process '$PM2_APP_NAME'."
    fi
  fi
fi

# ---------------------------------------------------------------------------
# 2. Fall back to .env file
# ---------------------------------------------------------------------------
if [[ "$PM2_LOADED" == "false" ]]; then
  ENV_FILE="${1:-$ROOT_DIR/.env}"
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "[backup] ERROR: PM2 not available and .env not found at $ENV_FILE" >&2
    exit 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip blank lines and comments
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    # Remove Windows-style carriage return
    line="${line%$'\r'}"
    if [[ "$line" =~ ^[[:space:]]*([A-Z_][A-Z0-9_]*)=(.*)$ ]]; then
      _key="${BASH_REMATCH[1]}"
      _val="${BASH_REMATCH[2]}"
      # Strip surrounding single or double quotes
      _val="${_val#\"}" _val="${_val%\"}"
      _val="${_val#\'}" _val="${_val%\'}"
      export "$_key=$_val"
    fi
  done < "$ENV_FILE"
  echo "[backup] Env loaded from .env file ($ENV_FILE)."
fi

# ---------------------------------------------------------------------------
# 3. Resolve final config values (apply defaults where needed)
# ---------------------------------------------------------------------------
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_DATABASE="${DB_DATABASE:-unionhub}"
UPLOAD_BASE_DIR="${UPLOAD_BASE_DIR:-$ROOT_DIR/uploads}"

TIMESTAMP="$(date +%Y%m%d_%H%M)"
DATE_LABEL="$(date +%Y-%m-%d)"
TMP_DIR="/tmp/unionhub-backup-${TIMESTAMP}"

echo "[backup] ===== UnionConnect Backup — $(date '+%Y-%m-%d %H:%M:%S') ====="
echo "[backup] DB: $DB_USERNAME@$DB_HOST:$DB_PORT/$DB_DATABASE"
echo "[backup] Uploads: $UPLOAD_BASE_DIR"
echo "[backup] Temp dir: $TMP_DIR"

mkdir -p "$TMP_DIR"

# ---------------------------------------------------------------------------
# 4. PostgreSQL dump
# ---------------------------------------------------------------------------
DB_DUMP="$TMP_DIR/db_${TIMESTAMP}.sql.gz"
echo "[backup] Dumping database..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  "$DB_DATABASE" | gzip > "$DB_DUMP"
echo "[backup] DB dump: $(du -sh "$DB_DUMP" | cut -f1)"

# ---------------------------------------------------------------------------
# 5. Uploads archive
# ---------------------------------------------------------------------------
UPLOADS_ARCHIVE="$TMP_DIR/uploads_${TIMESTAMP}.tar.gz"
if [[ -d "$UPLOAD_BASE_DIR" ]]; then
  echo "[backup] Archiving uploads..."
  tar -czf "$UPLOADS_ARCHIVE" -C "$(dirname "$UPLOAD_BASE_DIR")" "$(basename "$UPLOAD_BASE_DIR")"
  echo "[backup] Uploads archive: $(du -sh "$UPLOADS_ARCHIVE" | cut -f1)"
else
  echo "[backup] WARNING: UPLOAD_BASE_DIR not found ($UPLOAD_BASE_DIR), skipping uploads archive."
fi

# ---------------------------------------------------------------------------
# 6. Upload to Google Drive
# ---------------------------------------------------------------------------
echo "[backup] BACKUP_SERVICE_ACCOUNT_PATH=${BACKUP_SERVICE_ACCOUNT_PATH:-<not set>}"
echo "[backup] BACKUP_DRIVE_FOLDER_ID=${BACKUP_DRIVE_FOLDER_ID:-<not set>}"
echo "[backup] Uploading to Google Drive..."
node "$SCRIPT_DIR/backup-drive.js" "$TMP_DIR" "$DATE_LABEL"
UPLOAD_EXIT=$?

# ---------------------------------------------------------------------------
# 7. Cleanup
# ---------------------------------------------------------------------------
rm -rf "$TMP_DIR"
echo "[backup] Temp dir cleaned up."

if [[ $UPLOAD_EXIT -ne 0 ]]; then
  echo "[backup] ERROR: Drive upload failed (exit $UPLOAD_EXIT)" >&2
  exit 1
fi

echo "[backup] ===== Backup completed successfully ====="
