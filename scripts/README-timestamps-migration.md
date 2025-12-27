# Timestamps Migration for "Latest Additions"

## Overview

This migration adds `created_at` and `updated_at` timestamp columns to the `girls` table to enable reliable, deterministic ordering for the "Latest Additions" section on the homepage.

## Goal

- **Deterministic ordering**: Use actual timestamps instead of guessing from IDs or flags
- **Fast homepage**: Pre-cached, server-side queries with proper indexes
- **Reliability**: If timestamps aren't available, the section won't render (no placeholders)

## What Gets Added

1. **Two columns** to `girls` table:
   - `created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`

2. **Two indexes** for fast queries:
   - `idx_girls_created_at` on `created_at DESC`
   - `idx_girls_updated_at` on `updated_at DESC`

3. **Two triggers** for automatic maintenance:
   - Updates `updated_at` when `girls` row is modified
   - Updates `girls.updated_at` when new images are inserted

## Semantics

- **`created_at`**: Set once on insert, never changed
- **`updated_at`**: Automatically updated when:
  - Actress metadata is edited (via trigger on `girls` UPDATE)
  - New photos are added (via trigger on `images` INSERT)

## How to Run

### Option 1: Using psql (Direct Connection)

```bash
psql $DATABASE_URL -f scripts/add-timestamps-to-girls.sql
```

### Option 2: Using Supabase CLI

```bash
supabase db execute --file scripts/add-timestamps-to-girls.sql
```

### Option 3: Manual Execution

Copy the SQL from `scripts/add-timestamps-to-girls.sql` and run it in your database admin tool (Supabase Dashboard, pgAdmin, etc.)

## Verification

After running the migration, verify it worked:

```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'girls' 
  AND column_name IN ('created_at', 'updated_at');

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'girls' 
  AND indexname IN ('idx_girls_created_at', 'idx_girls_updated_at');

-- Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'girls' 
   OR event_object_table = 'images';
```

## API Changes

The `/api/latest-additions` endpoint now:
- Orders by `updated_at DESC` (primary), then `created_at DESC` (fallback)
- Only returns entries with valid timestamps
- Returns empty array if timestamps aren't available (section won't render)

## Rollback (If Needed)

If you need to remove the timestamps:

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_girls_updated_at ON girls;
DROP TRIGGER IF EXISTS trigger_update_girls_on_image_insert ON images;

-- Drop functions
DROP FUNCTION IF EXISTS update_girls_updated_at();
DROP FUNCTION IF EXISTS update_girls_updated_at_on_image_insert();

-- Drop indexes
DROP INDEX IF EXISTS idx_girls_created_at;
DROP INDEX IF EXISTS idx_girls_updated_at;

-- Drop columns
ALTER TABLE girls DROP COLUMN IF EXISTS created_at;
ALTER TABLE girls DROP COLUMN IF EXISTS updated_at;
```

## Notes

- Existing rows will have timestamps set to `now()` (one-time migration)
- Future inserts will automatically set both timestamps
- Future updates will automatically update `updated_at`
- Adding images will automatically update `girls.updated_at`

