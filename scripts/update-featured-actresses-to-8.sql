-- Update featured actresses system to support up to 8 entries
-- This allows editorial curation of up to 8 featured actresses for the homepage

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_featured_order_range'
  ) THEN
    ALTER TABLE girls DROP CONSTRAINT check_featured_order_range;
  END IF;
END $$;

-- Add new constraint to allow featured_order between 1 and 8
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_featured_order_range'
  ) THEN
    ALTER TABLE girls 
    ADD CONSTRAINT check_featured_order_range 
    CHECK (featured_order IS NULL OR (featured_order >= 1 AND featured_order <= 8));
  END IF;
END $$;

-- Drop and recreate unique index to support 1-8 range
DROP INDEX IF EXISTS idx_girls_featured_order_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_girls_featured_order_unique 
ON girls(featured_order) 
WHERE featured_order IS NOT NULL;

