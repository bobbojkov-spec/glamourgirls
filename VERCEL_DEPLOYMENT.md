# Vercel Deployment Guide

## Changes Made for Vercel Compatibility

### 1. ✅ Replaced Canvas with SVG Watermarking
- **Issue**: The `canvas` native module doesn't work on Vercel's serverless environment
- **Solution**: Replaced canvas-based watermarking with SVG-based solution using Sharp
- **File**: `src/app/api/admin/images/upload/route.ts`
- **Status**: ✅ Completed

### 2. ✅ Added Prisma Postinstall Script
- **Issue**: Prisma Client needs to be generated during build
- **Solution**: Added `"postinstall": "prisma generate"` to package.json
- **Status**: ✅ Completed

### 3. ✅ Moved Native Dependencies to DevDependencies
- **Dependencies moved**: `canvas`, `better-sqlite3`, `mysql2`
- **Reason**: These are only used in local scripts, not in the deployed application
- **Status**: ✅ Completed

### 4. ✅ Created vercel.json Configuration
- **File**: `vercel.json`
- **Status**: ✅ Completed

## Required Environment Variables in Vercel

You **MUST** set these environment variables in your Vercel project settings:

### Database (Supabase PostgreSQL) - Required
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

### Supabase Client (for client-side) - Required
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### Email (Resend) - Optional but Recommended
```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Glamour Girls <web@glamourgirlsofthesilverscreen.com>
```

### Base URL - Optional
```
NEXT_PUBLIC_BASE_URL=https://glamourgirls-gmz2ikmhc-bob-bojkovs-projects.vercel.app
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above
4. Make sure to select the correct environments (Production, Preview, Development)
5. **Redeploy** your application after adding variables

## Build Configuration

The following configuration is now in place:

- **Build Command**: `npm run build` (default)
- **Install Command**: `npm install` (default)
- **Framework**: Next.js (auto-detected)
- **Postinstall**: Automatically runs `prisma generate` after install

## Verification Steps

After deployment, verify:

1. ✅ Build completes successfully (check Vercel build logs)
2. ✅ Application starts without errors
3. ✅ Database connections work (check logs for "✅ New PostgreSQL connection established")
4. ✅ Pages load correctly
5. ✅ API routes respond correctly

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `DATABASE_URL` is correct and accessible from Vercel
- Check build logs for specific error messages

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify database connection strings are correct
- Ensure Supabase allows connections from Vercel IPs (usually enabled by default)

### Database Connection Issues
- Verify `DATABASE_URL` and `DIRECT_URL` are set correctly
- Check that SSL is enabled for Supabase connections (handled automatically in code)
- Verify database credentials are correct

## Notes

- Native dependencies (`canvas`, `better-sqlite3`, `mysql2`) are in devDependencies and won't cause build issues
- Sharp is pre-installed on Vercel, so image processing will work correctly
- Prisma Client is generated automatically via the postinstall script

