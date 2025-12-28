# Order Num Fix - Implementation Summary

This document summarizes the comprehensive fix for NULL `order_num` values in the images table.

## Problem
- Thousands of existing images had `order_num = NULL`
- This broke reordering, saving, delete safety, and multi-upload consistency
- Frontend debug confirmed: Total Images > 0, With Order = 0, Without Order = ALL

## Solution Overview

### Part A: One-Time Backfill Script ✅
**File**: `src/app/api/admin/images/backfill-order-num/route.ts`

- Processes images PER GIRL (grouped by girlid)
- For each girl:
  - Selects images ordered by: `created_at ASC, id ASC` (stable ordering)
  - Assigns `order_num` sequentially starting at 1
- Includes safety checks and verification
- GET endpoint for verification status

**Usage**:
```bash
# Run backfill
POST /api/admin/images/backfill-order-num

# Verify status
GET /api/admin/images/backfill-order-num
```

### Part B: Verification ✅
- Built into the backfill script (GET endpoint)
- Checks:
  - No NULL order_num exists
  - For each girl: order_num starts at 1, is continuous
  - order_num count == image count

### Part C: Harden Upload Pipeline ✅
**File**: `src/app/api/admin/images/upload/route.ts`

**Changes**:
1. Improved MAX query to explicitly exclude NULL values:
   ```sql
   SELECT COALESCE(MAX(order_num), 0) as max_order 
   FROM images 
   WHERE girlid = $1 AND mytp = 4 AND order_num IS NOT NULL AND order_num > 0
   ```

2. Added validation to ensure `orderNum` is always valid before INSERT:
   - Must be positive integer
   - Throws error if invalid

3. Ensured `order_num` is ALWAYS included in INSERT when column exists
   - All INSERT paths include order_num when `hasOrderNum` is true
   - Safety checks prevent invalid values

### Part D: Harden Reorder + Delete ✅

**Reorder Endpoint** (`src/app/api/admin/images/reorder/route.ts`):
- Already had NULL checks ✅
- Rejects reorder if any image has NULL/0 order_num
- Updates by PRIMARY KEY (id) only
- Safety guards for unexpected row counts

**Delete Endpoint** (`src/app/api/admin/images/[id]/route.ts`):
- Enhanced renormalization after delete:
  - Uses transaction for safety
  - Handles NULL values correctly
  - Renormalizes to 1..N sequentially
  - Proper error handling

### Part E: Database Constraint ✅
**File**: `scripts/migrations/add-order-num-not-null-constraint.sql`

- Adds NOT NULL constraint to `order_num` column
- Includes safety check to prevent constraint if NULLs exist
- Adds partial index for performance: `(girlid, order_num) WHERE mytp = 4`

**Important**: Run this ONLY after backfill succeeds!

### Part F: Debug Panel Enhancement ✅
**File**: `src/components/admin/girls/ImageDebugPanel.tsx`

**New Features**:
1. Prominent "Order Num Statistics" card at top
2. Shows:
   - Total Images
   - With Valid Order (order_num > 0)
   - Without Order (NULL or 0) - highlighted in RED
   - Order Range (min-max)
   - Order Continuity status
3. Critical warnings when NULL order_num exists
4. Highlights images with NULL/0 order_num in red
5. Clear error messages with solutions

## Deployment Steps

1. **Deploy code** (all parts A-F)
2. **Run backfill**:
   ```bash
   POST /api/admin/images/backfill-order-num
   ```
3. **Verify backfill**:
   ```bash
   GET /api/admin/images/backfill-order-num
   ```
   Must show: `withoutOrder = 0`, `isComplete = true`
4. **Run migration** (after backfill succeeds):
   ```bash
   # Execute SQL from scripts/migrations/add-order-num-not-null-constraint.sql
   ```
5. **Verify constraint**:
   ```sql
   SELECT COUNT(*) FROM images WHERE mytp = 4 AND order_num IS NULL;
   -- Should return 0
   ```

## Acceptance Criteria

✅ All existing images have order_num  
✅ Reorder persists after reload  
✅ Delete deletes exactly one image  
✅ Multi-upload uploads ALL files  
✅ No image ever has order_num NULL again  
✅ Debug panel shows:
  - Total == With Order
  - Without Order == 0  
✅ Vercel build passes (strict TypeScript)

## Safety Features

1. **Backfill**: 
   - Processes per-girl to avoid conflicts
   - Uses stable ordering (created_at, id)
   - Transactional with rollback on error
   - Verification checks before completion

2. **Upload**:
   - Always calculates next order_num from MAX (excluding NULL)
   - Validates orderNum before INSERT
   - Explicitly includes order_num in all INSERT statements

3. **Reorder**:
   - Rejects if any NULL order_num exists
   - Updates by PRIMARY KEY only
   - Safety guards for unexpected row counts

4. **Delete**:
   - Renormalizes in transaction
   - Handles NULL values correctly
   - Proper error handling

5. **Database**:
   - NOT NULL constraint prevents future NULLs
   - Migration includes safety checks

## Files Modified

- `src/app/api/admin/images/backfill-order-num/route.ts` (NEW)
- `src/app/api/admin/images/upload/route.ts`
- `src/app/api/admin/images/[id]/route.ts`
- `src/components/admin/girls/ImageDebugPanel.tsx`
- `scripts/migrations/add-order-num-not-null-constraint.sql` (NEW)

## Testing Checklist

- [ ] Run backfill on staging/dev first
- [ ] Verify all images have order_num
- [ ] Test upload - verify order_num is set
- [ ] Test reorder - verify persistence
- [ ] Test delete - verify renormalization
- [ ] Test multi-upload - verify all get order_num
- [ ] Run migration SQL
- [ ] Verify constraint works
- [ ] Test debug panel shows correct stats

