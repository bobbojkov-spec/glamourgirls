#!/bin/bash

# Database Restore Script
# 
# Restores a database backup file to your Supabase/PostgreSQL database
#
# Usage: ./scripts/restore-database.sh <backup_file.sql>
#
# WARNING: This will replace your current database content!

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Backup file is required${NC}"
  echo ""
  echo "Usage: ./scripts/restore-database.sh <backup_file.sql>"
  echo ""
  echo "Example:"
  echo "  ./scripts/restore-database.sh backups/db-backup-2025-01-15-123456.sql"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
  exit 1
fi

# Load environment variables from .env files (Next.js style)
if [ -f ".env.local" ]; then
  echo "📄 Loading .env.local..."
  export $(grep -v '^#' .env.local | xargs)
elif [ -f ".env" ]; then
  echo "📄 Loading .env..."
  export $(grep -v '^#' .env | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
  echo ""
  echo "Please set it in your .env.local or .env file"
  exit 1
fi

# Check if psql is installed (prefer PostgreSQL 17 for compatibility)
if command -v /opt/homebrew/opt/postgresql@17/bin/psql &> /dev/null; then
  PSQL="/opt/homebrew/opt/postgresql@17/bin/psql"
elif command -v psql &> /dev/null; then
  PSQL="psql"
else
  echo -e "${RED}Error: psql is not installed${NC}"
  echo ""
  echo "Install it with:"
  echo "  macOS: brew install postgresql@17"
  echo "  Ubuntu: sudo apt-get install postgresql-client-17"
  exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will replace your current database!${NC}"
echo -e "Backup file: ${YELLOW}${BACKUP_FILE}${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo ""
echo -e "${GREEN}🔄 Starting database restore...${NC}"

# Handle gzipped files
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "📦 Decompressing backup file..."
  TEMP_FILE=$(mktemp)
  gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
  BACKUP_FILE="$TEMP_FILE"
  trap "rm -f $TEMP_FILE" EXIT
fi

# Clean DATABASE_URL - remove query parameters (pgbouncer=true, etc.)
CLEAN_DATABASE_URL="${DATABASE_URL%%\?*}"

# Restore database
echo "📥 Restoring database..."
if "$PSQL" "$CLEAN_DATABASE_URL" < "$BACKUP_FILE" 2>&1; then
  echo ""
  echo -e "${GREEN}✅ Database restored successfully!${NC}"
else
  echo ""
  echo -e "${RED}❌ Restore failed!${NC}"
  echo "Check the error messages above"
  exit 1
fi

echo ""
echo -e "${GREEN}✨ Done!${NC}"

