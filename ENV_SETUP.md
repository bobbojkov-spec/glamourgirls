# Environment setup

## Supabase (recommended)

### 1) Server-side DB connection (used by `src/lib/db.ts` and Prisma)

Get your connection strings from Supabase Dashboard → **Settings → Database → Connection string**.

Set these environment variables (locally in your shell, your hosting provider, or a local env manager):

```bash
# App/runtime DB URL (often pooler/pgbouncer)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# Direct DB URL (recommended for Prisma migrations / DDL)
export DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# Optional: used by migration scripts (preferred name for target)
export TARGET_DATABASE_URL="$DATABASE_URL"
```

Notes:
- `src/lib/db.ts` automatically enables SSL when the hostname ends with `.supabase.co`.
- Prisma schema expects **both** `DATABASE_URL` and `DIRECT_URL` (see `prisma/schema.prisma`).

### 2) Supabase JS (client-side)

Get these from Supabase Dashboard → **Project Settings → API**:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

## Quick checks

```bash
npm run db:check-supabase
```

## Migration (optional)

If you are migrating an existing DB into Supabase, see `SUPABASE_MIGRATION_GUIDE.md` and run:

```bash
npm run db:migrate-supabase
```






