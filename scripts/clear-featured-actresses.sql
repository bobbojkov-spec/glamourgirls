-- Clear all featured actresses from the database
-- This resets all actresses to not featured and clears their featured_order

UPDATE girls 
SET is_featured = false, 
    featured_order = NULL 
WHERE is_featured = true;

-- Verify the update
SELECT COUNT(*) as remaining_featured 
FROM girls 
WHERE is_featured = true;

