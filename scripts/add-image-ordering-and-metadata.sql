-- Migration: Add image ordering and original metadata fields to images table
-- This migration adds:
-- - order_num: Explicit ordering per girl (1..N)
-- - original_width, original_height, original_file_bytes: Captured BEFORE resizing
-- - original_mime, original_filename: Original upload metadata
-- - storage_paths: JSONB array of all storage object paths for cascade deletion

-- Add new columns
ALTER TABLE images 
  ADD COLUMN IF NOT EXISTS order_num INTEGER,
  ADD COLUMN IF NOT EXISTS original_width INTEGER,
  ADD COLUMN IF NOT EXISTS original_height INTEGER,
  ADD COLUMN IF NOT EXISTS original_file_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS original_mime VARCHAR(255),
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS storage_paths JSONB;

-- Backfill order_num for existing images per girl using id ASC (stable ordering)
-- This ensures existing images have a valid order_num
DO $$
DECLARE
  girl_record RECORD;
  img_count INTEGER;
BEGIN
  FOR girl_record IN SELECT DISTINCT girlid FROM images WHERE girlid > 0 LOOP
    -- Set order_num based on id ASC for each girl
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as rn
      FROM images
      WHERE girlid = girl_record.girlid AND mytp = 4  -- Only gallery images (mytp=4) get order_num
    )
    UPDATE images i
    SET order_num = o.rn
    FROM ordered o
    WHERE i.id = o.id;
  END LOOP;
END $$;

-- Backfill original_* fields where possible from existing data
-- For existing images, we'll use the current width/height/sz as best guess
UPDATE images
SET 
  original_width = COALESCE(original_width, width),
  original_height = COALESCE(original_height, height),
  original_file_bytes = CASE 
    WHEN sz ~ '^[0-9]+$' THEN CAST(sz AS BIGINT)
    ELSE NULL
  END,
  original_mime = COALESCE(original_mime, mimetype),
  storage_paths = CASE
    WHEN path IS NOT NULL THEN jsonb_build_array(path)
    ELSE '[]'::jsonb
  END
WHERE original_width IS NULL OR original_file_bytes IS NULL;

-- Set NOT NULL constraints for new uploads (allow NULL for legacy rows temporarily)
-- We'll enforce NOT NULL in application code for new uploads
-- Note: PostgreSQL doesn't allow adding NOT NULL to existing nullable columns with NULL values
-- So we keep them nullable but enforce in application logic

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_images_girlid_order_num ON images(girlid, order_num) WHERE order_num IS NOT NULL;

-- Add comment
COMMENT ON COLUMN images.order_num IS 'Explicit ordering per girl (1..N). Only gallery images (mytp=4) have order_num.';
COMMENT ON COLUMN images.original_width IS 'Original pixel width BEFORE any resizing/processing';
COMMENT ON COLUMN images.original_height IS 'Original pixel height BEFORE any resizing/processing';
COMMENT ON COLUMN images.original_file_bytes IS 'Original file size in bytes BEFORE any processing';
COMMENT ON COLUMN images.storage_paths IS 'JSONB array of all Supabase Storage paths for this image (original, thumb, gallery, HQ)';

