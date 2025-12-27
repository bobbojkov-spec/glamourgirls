-- ============================================
-- Add Minimal Timestamps for Reliable "Latest" Logic
-- ============================================
-- 
-- GOAL: Enable deterministic "Latest Additions" ordering
-- SEMANTICS:
--   - created_at: Set once on insert, never changed
--   - updated_at: Updated when photos/metadata change
-- 
-- If updated_at cannot be reliably maintained, do NOT show "Latest Additions" section.

-- Add timestamp columns to girls table (PostgreSQL/Supabase)
ALTER TABLE girls 
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create indexes for fast "Latest Additions" queries
CREATE INDEX IF NOT EXISTS idx_girls_created_at ON girls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_girls_updated_at ON girls(updated_at DESC);

-- Update existing rows: set timestamps to current time (one-time migration)
-- Note: This is a best-effort default - real timestamps would require historical data
UPDATE girls 
SET created_at = now()
WHERE created_at IS NULL;

UPDATE girls 
SET updated_at = now()
WHERE updated_at IS NULL;

-- Create trigger function to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_girls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Always update updated_at on any UPDATE operation
    -- This ensures updated_at reflects when metadata/photos were last modified
    -- Note: We don't check if data changed - any UPDATE means something was modified
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on UPDATE
DROP TRIGGER IF EXISTS trigger_update_girls_updated_at ON girls;
CREATE TRIGGER trigger_update_girls_updated_at
    BEFORE UPDATE ON girls
    FOR EACH ROW
    EXECUTE FUNCTION update_girls_updated_at();

-- Create trigger on images table to update girls.updated_at when new photos are added
-- This ensures that adding photos automatically updates the actress's updated_at timestamp
CREATE OR REPLACE FUNCTION update_girls_updated_at_on_image_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new image is inserted, update the corresponding girl's updated_at
    -- This ensures "Latest Additions" reflects when photos were added
    UPDATE girls 
    SET updated_at = now()
    WHERE id = NEW.girlid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update girls.updated_at when images are inserted
DROP TRIGGER IF EXISTS trigger_update_girls_on_image_insert ON images;
CREATE TRIGGER trigger_update_girls_on_image_insert
    AFTER INSERT ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_girls_updated_at_on_image_insert();

-- Note: 
-- - For INSERT operations on girls, both created_at and updated_at will be set to now() by DEFAULT
-- - For UPDATE operations on girls, updated_at will be automatically updated by the trigger
-- - For INSERT operations on images, girls.updated_at will be automatically updated by the trigger

