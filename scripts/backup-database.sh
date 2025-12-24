#!/bin/bash

# Database Backup Script for Supabase/PostgreSQL
# 
# This script creates a local backup of your Supabase database
# 
# Usage: ./scripts/backup-database.sh [output_file.sql]
#
# If no output file is specified, it will create a timestamped file:
# backups/db-backup-YYYY-MM-DD-HHMMSS.sql

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the output file name
if [ -z "$1" ]; then
  # Create backups directory if it doesn't exist
  mkdir -p backups
  
  # Generate timestamped filename
  TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
  OUTPUT_FILE="backups/db-backup-${TIMESTAMP}.sql"
else
  OUTPUT_FILE="$1"
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
  echo "Please set it in your .env.local or .env file:"
  echo "  DATABASE_URL='postgresql://user:password@host:port/database'"
  echo ""
  echo "Or export it directly:"
  echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
  exit 1
fi

# Check if pg_dump is installed (prefer PostgreSQL 17 for compatibility)
if command -v /opt/homebrew/opt/postgresql@17/bin/pg_dump &> /dev/null; then
  PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
elif command -v pg_dump &> /dev/null; then
  PG_DUMP="pg_dump"
else
  echo -e "${RED}Error: pg_dump is not installed${NC}"
  echo ""
  echo "Install it with:"
  echo "  macOS: brew install postgresql@17"
  echo "  Ubuntu: sudo apt-get install postgresql-client-17"
  exit 1
fi

echo -e "${GREEN}🔄 Starting database backup...${NC}"
echo -e "Output file: ${YELLOW}${OUTPUT_FILE}${NC}"
echo ""

# Clean DATABASE_URL - remove query parameters (pgbouncer=true, etc.) that pg_dump doesn't support
CLEAN_DATABASE_URL="${DATABASE_URL%%\?*}"

# Run pg_dump
echo "📦 Dumping database..."
ERROR_LOG=$(mktemp)

# Note: Using --no-sync for better performance
if "$PG_DUMP" "$CLEAN_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --no-sync \
  > "$OUTPUT_FILE" 2> "$ERROR_LOG"; then
  
  # Get file size
  FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  
  echo ""
  echo -e "${GREEN}✅ Backup completed successfully!${NC}"
  echo -e "File: ${YELLOW}${OUTPUT_FILE}${NC}"
  echo -e "Size: ${YELLOW}${FILE_SIZE}${NC}"
  echo ""
  
  # Compress option
  echo "💾 Compressing backup..."
  if command -v gzip &> /dev/null; then
    gzip -f "$OUTPUT_FILE"
    COMPRESSED_FILE="${OUTPUT_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✅ Compressed to: ${YELLOW}${COMPRESSED_FILE}${NC}"
    echo -e "Compressed size: ${YELLOW}${COMPRESSED_SIZE}${NC}"
  else
    echo -e "${YELLOW}⚠️  gzip not found, skipping compression${NC}"
  fi
  
else
  echo ""
  echo -e "${RED}❌ Backup failed!${NC}"
  echo "Error details:"
  cat "$ERROR_LOG"
  rm -f "$ERROR_LOG"
  exit 1
fi

rm -f "$ERROR_LOG"

echo ""
echo -e "${GREEN}✨ Done!${NC}"

