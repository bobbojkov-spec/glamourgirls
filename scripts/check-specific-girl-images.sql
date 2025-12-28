-- Check order_num for a specific girl's gallery images
-- REPLACE YOUR_GIRL_ID with the actual girl ID from the URL

SELECT 
  id,
  girlid,
  mytp,
  order_num,
  path
FROM images
WHERE girlid = YOUR_GIRL_ID  -- ⚠️ CHANGE THIS: Replace YOUR_GIRL_ID with actual number (e.g., 123)
  AND mytp = 4  -- Gallery images only
ORDER BY id ASC;

