#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 1) Checking target DB connection + emptiness"
npx tsx scripts/check-supabase-connection.ts

echo ""
echo "==> 2) Running migration (resume-safe, fast)"
export MIGRATION_SKIP_FULL_TABLES=1
export MIGRATION_EXCLUDE_TABLES="members,members_2009,members_2011,newsletter,newsletter2,newsletter2_filter,newsletter2_images,newsletter2_running,newsletter2_states,newslettermembers,newsletters2_sended,newsletter2_run,newsletter2_stats,newsletters2_sent"

# Schema is already applied in Supabase SQL Editor; and with pooler we should not run DDL anyway.
npx tsx scripts/migrate-to-supabase.ts --skip-schema --skip-full-tables

echo ""
echo "==> 3) Verifying key table row counts (source vs target)"
npx tsx scripts/verify-migration.ts






