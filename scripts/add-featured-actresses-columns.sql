-- Add featured actresses columns to girls table
-- This allows manual curation of exactly 4 featured actresses for the homepage

-- Add is_featured boolean column (default false)
ALTER TABLE girls 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add featured_order integer column (nullable, 1-4)
ALTER TABLE girls 
ADD COLUMN IF NOT EXISTS featured_order INTEGER;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_girls_is_featured ON girls(is_featured);
CREATE INDEX IF NOT EXISTS idx_girls_featured_order ON girls(featured_order);

-- Add constraint to ensure featured_order is between 1 and 4
-- Note: PostgreSQL doesn't support IF NOT EXISTS for constraints, so we check first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_featured_order_range'
  ) THEN
    ALTER TABLE girls 
    ADD CONSTRAINT check_featured_order_range 
    CHECK (featured_order IS NULL OR (featured_order >= 1 AND featured_order <= 4));
  END IF;
END $$;

-- Add unique constraint to prevent duplicate featured_order values
-- Note: This allows NULL values (multiple NULLs are allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_girls_featured_order_unique 
ON girls(featured_order) 
WHERE featured_order IS NOT NULL;

