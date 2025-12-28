-- Verify order_num status for all gallery images
-- Run this in your SQL editor (pgAdmin, DBeaver, etc.)

-- Overall status
SELECT 
  COUNT(*) FILTER (WHERE mytp = 4) as total_gallery_images,
  COUNT(*) FILTER (WHERE mytp = 4 AND order_num IS NOT NULL AND order_num > 0) as with_order_num,
  COUNT(*) FILTER (WHERE mytp = 4 AND (order_num IS NULL OR order_num = 0)) as without_order_num
FROM images;

-- Should show:
-- total_gallery_images: 3384
-- with_order_num: 3384
-- without_order_num: 0

-- Check for any NULL or 0 values (should return 0 rows)
SELECT id, girlid, order_num, path
FROM images
WHERE mytp = 4 AND (order_num IS NULL OR order_num = 0)
ORDER BY girlid, id;

-- Verify constraint exists
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'images'::regclass 
  AND conname LIKE '%order_num%';

-- Check for gaps in order_num per girl (should return 0 rows if all are continuous)
SELECT 
  girlid,
  COUNT(*) as total_images,
  MIN(order_num) as min_order,
  MAX(order_num) as max_order,
  MAX(order_num) - MIN(order_num) + 1 as expected_count
FROM images
WHERE mytp = 4 AND order_num IS NOT NULL AND order_num > 0
GROUP BY girlid
HAVING COUNT(*) != MAX(order_num) - MIN(order_num) + 1 OR MIN(order_num) != 1;

