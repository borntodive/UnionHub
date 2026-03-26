#!/usr/bin/env bash
# reset-tables.sh
# Drops all tables in the database (CASCADE) and reruns migrations.
# Does NOT drop the database itself.
#
# Usage:
#   ./scripts/reset-tables.sh                          # reads api/.env
#   ./scripts/reset-tables.sh /path/to/.env.production # explicit env file

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Resolve .env file ─────────────────────────────────────────────────────────
if [[ -n "${1:-}" ]]; then
  ENV_FILE="$1"
else
  ENV_FILE="$SCRIPT_DIR/../.env"
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "→ Loading credentials from $ENV_FILE"
  export $(grep -E '^DB_' "$ENV_FILE" | sed 's/#.*//' | xargs)
else
  echo "→ No .env file found, using environment variables as-is"
fi

# ── Resolve credentials (env vars take priority over defaults) ────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_DATABASE="${DB_DATABASE:-unionhub}"

echo ""
echo "  Host:     $DB_HOST:$DB_PORT"
echo "  User:     $DB_USERNAME"
echo "  Database: $DB_DATABASE"
echo ""

export PGPASSWORD="$DB_PASSWORD"

# ── Confirm ───────────────────────────────────────────────────────────────────
echo "⚠️  This will DROP all tables in '$DB_DATABASE' and rerun migrations."
read -p "Continue? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ── Drop all tables and types (CASCADE) ──────────────────────────────────────
echo "→ Dropping all tables and enum types..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" <<'SQL'
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all tables
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;

  -- Drop all custom types (enums, composites, etc.)
  FOR r IN
    SELECT typname
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typtype IN ('e', 'c')
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END;
$$;
SQL
echo "✓ All tables and types dropped."

# ── Run migrations ────────────────────────────────────────────────────────────
echo "→ Running migrations..."
cd "$SCRIPT_DIR/.."
npm run migration:run
echo "✓ Migrations complete."
