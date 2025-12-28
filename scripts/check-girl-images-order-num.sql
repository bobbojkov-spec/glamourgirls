-- Check order_num for a specific girl's gallery images
-- Replace GIRL_ID with the actual girl ID from the URL or admin panel

-- Example: If the girl ID is 123, change GIRL_ID to 123
SELECT 
  id,
  girlid,
  mytp,
  order_num,
  path,
  width,
  height
FROM images
WHERE girlid = GIRL_ID  -- Replace GIRL_ID with actual ID
  AND mytp = 4  -- Gallery images only
ORDER BY id ASC;

-- Check if order_num is NULL or 0 for this girl
SELECT 
  COUNT(*) as total_images,
  COUNT(*) FILTER (WHERE order_num IS NOT NULL AND order_num > 0) as with_order,
  COUNT(*) FILTER (WHERE order_num IS NULL OR order_num = 0) as without_order
FROM images
WHERE girlid = GIRL_ID  -- Replace GIRL_ID with actual ID
  AND mytp = 4;

