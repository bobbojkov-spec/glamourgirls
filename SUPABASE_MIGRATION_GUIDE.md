# Supabase Migration Guide

This guide will help you migrate your PostgreSQL database to Supabase.

## Prerequisites

1. **Supabase Project**: Create a new Supabase project at https://supabase.com
2. **Database Connection String**: Get your Supabase database connection string from:
   - Supabase Dashboard → Settings → Database → Connection string
   - Use the "Connection pooling" or "Direct connection" string

## Files Generated

- `scripts/supabase-schema-clean.sql` - Clean SQL schema for Supabase (all tables, indexes, constraints)
- `scripts/migrate-to-supabase.ts` - Migration script that transfers all data
- `scripts/verify-postgresql-migration.ts` - Verification script (for current DB)

## Migration Steps

### Step 1: Get Supabase Connection Details

You'll need one of these:

**Option A: Connection String (Recommended)**
```bash
export SUPABASE_DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

#### IPv4-only networks (important)

If Supabase shows **“Not IPv4 compatible”**, your `db.<project-ref>.supabase.co:5432` hostname may be **IPv6-only**.

Your options:
- Use an **IPv6-capable** network (or enable IPv6 on your network/router)
- Use the **Supabase Shared Pooler** connection string (works on IPv4 networks)
- Purchase the **Supabase IPv4 add-on**

**Option B: Individual Parameters**
```bash
export SUPABASE_DB_HOST="db.[YOUR-PROJECT-REF].supabase.co"
export SUPABASE_DB_PORT="5432"
export SUPABASE_DB_NAME="postgres"
export SUPABASE_DB_USER="postgres"
export SUPABASE_DB_PASSWORD="[YOUR-PASSWORD]"
```

### Step 2: Review the Schema

The schema has been generated in `scripts/supabase-schema-clean.sql`. Review it to ensure it matches your requirements:

```bash
cat scripts/supabase-schema-clean.sql
```

### Step 3: Run the Migration

**Important**: This will:
- Create all tables in Supabase
- Copy all data from your current database
- Preserve all relationships and constraints

```bash
# Make sure you have the Supabase connection details set
npx tsx scripts/migrate-to-supabase.ts
```

#### If you are using the Shared Pooler / PgBouncer (port 6543)

DDL (CREATE TABLE / ALTER TABLE) is often unreliable through the pooler. The migration script will **auto-skip schema creation** when it detects a pooler URL.

Do this instead:
1. Open Supabase Dashboard → **SQL Editor**
2. Paste and run: `scripts/supabase-schema-clean.sql`
3. Then run data migration:

```bash
npx tsx scripts/migrate-to-supabase.ts --skip-schema
```

#### Connection-only test (no changes)

```bash
npx tsx scripts/migrate-to-supabase.ts --check-only
```

or:

```bash
npx tsx scripts/check-supabase-connection.ts
```

The script will:
1. ✅ Test connections to both databases
2. ✅ Create all tables in Supabase
3. ✅ Migrate all data (37 tables, ~109,000 rows)
4. ✅ Verify the migration

### Step 4: Verify Migration

After migration, verify the data:

```bash
# Connect to Supabase and check counts
# You can use Supabase SQL Editor or psql
```

## What Gets Migrated

- **37 tables** including:
  - `girls` (818 records)
  - `images` (11,389 records)
  - `girlinfos` (31,381 records)
  - `girllinks` (1,563 records)
  - `members` (14,946 records)
  - And 32 more tables...

- **All indexes** and **constraints**
- **All foreign key relationships**
- **All sequences** for auto-incrementing IDs

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Check your Supabase connection string
2. Ensure your IP is allowed in Supabase (Settings → Database → Connection Pooling)
3. For local development, you may need to add your IP to Supabase's allowed IPs

### Duplicate Key Errors

The migration script handles duplicate keys gracefully. If a record already exists, it will skip it.

### Large Tables

For very large tables, the migration may take time. The script shows progress for each table.

## After Migration

1. **Update your application** to use Supabase connection:
   ```typescript
   // Update src/lib/db.ts or create new Supabase connection
   const supabasePool = new Pool({
     connectionString: process.env.SUPABASE_DATABASE_URL,
     ssl: { rejectUnauthorized: false },
   });
   ```

2. **Test your application** thoroughly

3. **Update environment variables**:
   ```bash
   # .env.local or .env
   DATABASE_URL=your-supabase-connection-string
   # OR
   DB_HOST=db.your-project.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your-password
   ```

## Uploading images to Supabase Storage

You created buckets:
- `glamourgirls_images` (public)
- `images_raw` (admin)

This repo includes an uploader that reads `images.path` from the local DB and uploads the corresponding files from `public/` into Supabase Storage using the same path structure:

- `/securepic/1/3.jpg` → bucket object key `securepic/1/3.jpg`
- `/newpic/...` → bucket object key `newpic/...`

### Required env

- `NEXT_PUBLIC_SUPABASE_URL` (already present for your app)
- **`SUPABASE_SERVICE_ROLE_KEY`** (needed for bulk uploads)

### Run upload (public bucket)

```bash
cd /Users/borislavbojkov/dev/gg26
npx tsx scripts/upload-images-to-supabase-storage.ts --bucket=glamourgirls_images --concurrency=5
```

### Also upload to raw bucket (optional)

```bash
npx tsx scripts/upload-images-to-supabase-storage.ts --bucket=glamourgirls_images --also-upload-raw=1 --raw-bucket=images_raw --concurrency=5
```

### Dry run / limit

```bash
npx tsx scripts/upload-images-to-supabase-storage.ts --dry-run=1 --limit=50
```

## Schema Details

The generated schema includes:
- All 37 tables with exact column definitions
- Primary keys
- Foreign key constraints
- Indexes (excluding primary key indexes)
- Sequences for auto-incrementing columns
- Default values
- NULL/NOT NULL constraints

## Notes

- The migration preserves all data types exactly
- Sequences are recreated but may need to be synced with actual data
- Foreign keys are created with CASCADE delete/update
- The migration is idempotent (safe to run multiple times)

## Support

If you encounter issues:
1. Check the error messages in the migration output
2. Verify your Supabase connection details
3. Check Supabase logs in the dashboard
4. Ensure you have proper permissions on the Supabase database

