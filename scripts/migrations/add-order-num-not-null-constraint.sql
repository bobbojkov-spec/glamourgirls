-- Migration: Add NOT NULL constraint to order_num column for gallery images (mytp = 4)
-- 
-- IMPORTANT: Run this migration ONLY AFTER the backfill script has successfully
-- set order_num for all existing gallery images (mytp = 4).
--
-- Pre-requisites:
-- 1. Run the backfill API endpoint: POST /api/admin/images/backfill-order-num
-- 2. Verify backfill succeeded: GET /api/admin/images/backfill-order-num
-- 3. Confirm: withoutOrder = 0, isComplete = true
--
-- This migration:
-- 1. Adds CHECK constraint to ensure gallery images (mytp = 4) have order_num NOT NULL
-- 2. Adds a partial index for performance: (girlid, order_num) WHERE mytp = 4
--
-- NOTE: We use a CHECK constraint instead of column-level NOT NULL because
-- non-gallery images (mytp = 3, 5) may legitimately have NULL order_num.
-- This constraint only applies to gallery images (mytp = 4).

-- CRITICAL: This migration MUST be run AFTER the backfill script
-- Run this first: POST /api/admin/images/backfill-order-num
-- Verify this: GET /api/admin/images/backfill-order-num (must show withoutOrder = 0)

BEGIN;

-- Step 1: Verify no NULL order_num exists for gallery images (safety check - FAILS EARLY if NULLs exist)
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM images
  WHERE mytp = 4 AND (order_num IS NULL OR order_num = 0);
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'PRE-REQUISITE NOT MET: % gallery images (mytp = 4) still have NULL or 0 order_num. You MUST run the backfill script first: POST /api/admin/images/backfill-order-num. Current state: % images need order_num assignment.', null_count, null_count;
  END IF;
END $$;

-- Step 2: Add CHECK constraint to ensure gallery images (mytp = 4) always have order_num NOT NULL
-- This allows NULL order_num for non-gallery images (mytp = 3, 5) but requires it for gallery images
ALTER TABLE images
ADD CONSTRAINT chk_gallery_order_num_not_null
CHECK (
  CASE 
    WHEN mytp = 4 THEN order_num IS NOT NULL AND order_num > 0
    ELSE true  -- Allow NULL for non-gallery images
  END
);

-- Step 3: Add partial index for performance
-- This index helps with ordering queries: WHERE girlid = ? AND mytp = 4 ORDER BY order_num
CREATE INDEX IF NOT EXISTS idx_images_girlid_order_num_gallery
ON images (girlid, order_num)
WHERE mytp = 4;

COMMIT;

-- Verification query (run after migration to confirm):
-- SELECT 
--   COUNT(*) FILTER (WHERE mytp = 4) as total_gallery,
--   COUNT(*) FILTER (WHERE mytp = 4 AND order_num IS NOT NULL AND order_num > 0) as with_order,
--   COUNT(*) FILTER (WHERE mytp = 4 AND (order_num IS NULL OR order_num = 0)) as without_order
-- FROM images;

