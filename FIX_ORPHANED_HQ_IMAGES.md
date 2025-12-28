# Fix: Orphaned HQ Images Issue

## Problem Summary
Actresses could show fewer "Photos" than "HQ Photos" (e.g., Julie Adams: 13 Photos but 15 HQ Photos). This was misleading and indicated orphaned HQ files/rows after gallery deletions.

## Root Cause
1. **Incomplete deletion**: When gallery images were deleted, the deletion endpoint only removed:
   - The gallery image database record
   - The thumbnail (if mytp=4)
   - Local filesystem files
   
   It did NOT delete:
   - HQ images (mytp=5) from the database
   - Files from Supabase Storage (both `glamourgirls_images` and `images_raw` buckets)

2. **Separate counting**: HQ images were counted independently from gallery images, allowing mismatches.

3. **No relationship enforcement**: HQ images were linked to gallery images only by ID pattern (galleryId ± 1), with no database constraints.

## Solution Implemented

### 1. Fixed Deletion Endpoint (`src/app/api/admin/images/[id]/route.ts`)
- **Cascade deletion**: When a gallery image is deleted, it now:
  - Finds and deletes the associated HQ image (by ID pattern: galleryId ± 1)
  - Deletes the thumbnail
  - Deletes all files from Supabase Storage:
    - Gallery images from `glamourgirls_images` bucket
    - HQ images from `images_raw` bucket
    - Thumbnails from `glamourgirls_images` bucket
  - Deletes all database records
  - Logs errors but continues with best-effort cleanup

- **Error handling**: 
  - Storage deletion failures are logged but don't block database deletion
  - Database deletion failures are reported as errors
  - All operations are logged for audit

### 2. Fixed Counting Logic
Updated all counting queries to ensure HQ count never exceeds gallery count by only counting HQ images that have a matching gallery image:

**Files updated:**
- `src/app/api/actresses/route.ts` - Actress list API
- `src/app/admin/girls/[id]/page.tsx` - Admin edit page
- `src/app/admin/page.tsx` - Admin dashboard
- `src/app/api/stats/route.ts` - Stats API
- `src/app/api/search-metadata/route.ts` - Search metadata API

**Query pattern:**
```sql
COUNT(CASE 
  WHEN i.mytp = 5 AND EXISTS (
    SELECT 1 FROM images i2 
    WHERE i2.girlid = i.girlid 
      AND i2.mytp = 4 
      AND (i2.id = i.id - 1 OR i2.id = i.id + 1)
  ) 
  THEN 1 
END) as "hqPhotoCount"
```

This ensures only HQ images with a matching gallery image are counted.

### 3. Repair Script (`scripts/repair-orphaned-hq-images.ts`)
Created a repair script to find and clean existing orphaned HQ assets:

**Usage:**
```bash
# List orphaned images (dry run)
npm run repair-orphaned-hq

# Delete orphaned images
npm run repair-orphaned-hq -- --delete
```

**Features:**
- Finds all HQ images without matching gallery images
- Groups results by actress for easy review
- Safe deletion with confirmation prompt
- Deletes from both database and Supabase Storage
- Comprehensive error reporting

## Data Consistency

### Prevention
- Deletion endpoint now ensures complete cleanup
- Counting logic prevents misleading displays
- All operations are logged for audit

### Repair
- Repair script can be run periodically to clean up any orphaned assets
- Script is safe to run multiple times (idempotent)

## Testing Recommendations

1. **Test deletion**:
   - Delete a gallery image from admin
   - Verify HQ image is also deleted from database
   - Verify files are deleted from Supabase Storage
   - Verify thumbnail is deleted

2. **Test counting**:
   - Check actress list page - HQ count should never exceed Photos count
   - Check admin dashboard - counts should be consistent
   - Check stats API - counts should match

3. **Test repair script**:
   - Run in dry-run mode first
   - Review orphaned images
   - Run with --delete flag to clean up

## Files Changed

### Core Changes
- `src/app/api/admin/images/[id]/route.ts` - Complete rewrite of deletion logic
- `src/app/api/actresses/route.ts` - Fixed HQ counting query
- `src/app/admin/girls/[id]/page.tsx` - Fixed HQ counting query
- `src/app/admin/page.tsx` - Fixed HQ counting query
- `src/app/api/stats/route.ts` - Fixed HQ counting query
- `src/app/api/search-metadata/route.ts` - Fixed HQ counting query

### New Files
- `scripts/repair-orphaned-hq-images.ts` - Repair script for orphaned assets
- `package.json` - Added `repair-orphaned-hq` script

## Notes

- The relationship between gallery and HQ images is still based on ID pattern (galleryId ± 1), not a foreign key. This is a legacy design that would require a migration to change.
- Storage deletion failures are logged but don't block the operation. This allows cleanup to continue even if some files are missing.
- The repair script should be run periodically to catch any edge cases or manual deletions that bypass the API.


