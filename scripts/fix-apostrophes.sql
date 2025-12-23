-- Fix Windows-1252 encoding issues in girlinfos table
-- CHR(145) = left single quotation mark -> replace with '
-- CHR(146) = right single quotation mark -> replace with '
-- CHR(147) = left double quotation mark -> replace with "
-- CHR(148) = right double quotation mark -> replace with "
-- CHR(150) = en dash -> replace with -
-- CHR(151) = em dash -> replace with --

BEGIN;

-- Fix apostrophes in lngtext
UPDATE girlinfos 
SET lngtext = REPLACE(lngtext, CHR(146), '''')
WHERE lngtext LIKE '%' || CHR(146) || '%';

UPDATE girlinfos 
SET lngtext = REPLACE(lngtext, CHR(145), '''')
WHERE lngtext LIKE '%' || CHR(145) || '%';

-- Fix apostrophes in shrttext
UPDATE girlinfos 
SET shrttext = REPLACE(shrttext, CHR(146), '''')
WHERE shrttext LIKE '%' || CHR(146) || '%';

UPDATE girlinfos 
SET shrttext = REPLACE(shrttext, CHR(145), '''')
WHERE shrttext LIKE '%' || CHR(145) || '%';

-- Fix double quotation marks in lngtext
UPDATE girlinfos 
SET lngtext = REPLACE(lngtext, CHR(147), '"')
WHERE lngtext LIKE '%' || CHR(147) || '%';

UPDATE girlinfos 
SET lngtext = REPLACE(lngtext, CHR(148), '"')
WHERE lngtext LIKE '%' || CHR(148) || '%';

-- Fix double quotation marks in shrttext
UPDATE girlinfos 
SET shrttext = REPLACE(shrttext, CHR(147), '"')
WHERE shrttext LIKE '%' || CHR(147) || '%';

UPDATE girlinfos 
SET shrttext = REPLACE(shrttext, CHR(148), '"')
WHERE shrttext LIKE '%' || CHR(148) || '%';

-- Fix dashes in lngtext
UPDATE girlinfos 
SET lngtext = REPLACE(lngtext, CHR(150), '-')
WHERE lngtext LIKE '%' || CHR(150) || '%';

UPDATE girlinfos 
SET lngtext = REPLACE(lngtext, CHR(151), '--')
WHERE lngtext LIKE '%' || CHR(151) || '%';

-- Fix dashes in shrttext
UPDATE girlinfos 
SET shrttext = REPLACE(shrttext, CHR(150), '-')
WHERE shrttext LIKE '%' || CHR(150) || '%';

UPDATE girlinfos 
SET shrttext = REPLACE(shrttext, CHR(151), '--')
WHERE shrttext LIKE '%' || CHR(151) || '%';

COMMIT;

-- Verify the fix
SELECT COUNT(*) as remaining_issues 
FROM girlinfos 
WHERE lngtext LIKE '%' || CHR(145) || '%' 
   OR lngtext LIKE '%' || CHR(146) || '%'
   OR shrttext LIKE '%' || CHR(145) || '%'
   OR shrttext LIKE '%' || CHR(146) || '%';

