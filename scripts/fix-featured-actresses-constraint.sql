-- Fix Featured Actresses database constraints
-- This allows featured_order to be NULL when is_featured is false
-- and enforces 1-8 range only when is_featured is true

-- Step 1: Drop the existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_featured_order_range'
  ) THEN
    ALTER TABLE girls DROP CONSTRAINT check_featured_order_range;
    RAISE NOTICE 'Dropped old constraint check_featured_order_range';
  ELSE
    RAISE NOTICE 'Constraint check_featured_order_range does not exist';
  END IF;
END $$;

-- Step 2: Add new conditional CHECK constraint
-- This allows NULL when not featured, and 1-8 when featured
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_featured_order_when_featured'
  ) THEN
    ALTER TABLE girls 
    ADD CONSTRAINT check_featured_order_when_featured
    CHECK (
      (is_featured = false AND featured_order IS NULL)
      OR
      (is_featured = true AND featured_order BETWEEN 1 AND 8)
    );
    RAISE NOTICE 'Added new constraint check_featured_order_when_featured';
  ELSE
    RAISE NOTICE 'Constraint check_featured_order_when_featured already exists';
  END IF;
END $$;

-- Step 3: Drop old unique index if it exists
DROP INDEX IF EXISTS idx_girls_featured_order_unique;

-- Step 4: Create new unique index that only applies when is_featured = true
CREATE UNIQUE INDEX IF NOT EXISTS unique_featured_order
ON girls (featured_order)
WHERE is_featured = true;

-- Verify the constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'check_featured_order_when_featured';

-- Verify the index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'unique_featured_order';

