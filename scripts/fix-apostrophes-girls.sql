-- Fix Windows-1252 encoding issues in girls table
-- CHR(145) = left single quotation mark -> replace with '
-- CHR(146) = right single quotation mark -> replace with '
-- CHR(147) = left double quotation mark -> replace with "
-- CHR(148) = right double quotation mark -> replace with "
-- CHR(150) = en dash -> replace with -
-- CHR(151) = em dash -> replace with --

BEGIN;

-- Fix apostrophes in sources
UPDATE girls 
SET sources = REPLACE(sources, CHR(146), '''')
WHERE sources LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET sources = REPLACE(sources, CHR(145), '''')
WHERE sources LIKE '%' || CHR(145) || '%';

-- Fix apostrophes in introtext
UPDATE girls 
SET introtext = REPLACE(introtext, CHR(146), '''')
WHERE introtext LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET introtext = REPLACE(introtext, CHR(145), '''')
WHERE introtext LIKE '%' || CHR(145) || '%';

-- Fix apostrophes in SEO fields
UPDATE girls 
SET seotitle = REPLACE(seotitle, CHR(146), '''')
WHERE seotitle LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET seotitle = REPLACE(seotitle, CHR(145), '''')
WHERE seotitle LIKE '%' || CHR(145) || '%';

UPDATE girls 
SET metadescription = REPLACE(metadescription, CHR(146), '''')
WHERE metadescription LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET metadescription = REPLACE(metadescription, CHR(145), '''')
WHERE metadescription LIKE '%' || CHR(145) || '%';

UPDATE girls 
SET metakeywords = REPLACE(metakeywords, CHR(146), '''')
WHERE metakeywords LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET metakeywords = REPLACE(metakeywords, CHR(145), '''')
WHERE metakeywords LIKE '%' || CHR(145) || '%';

UPDATE girls 
SET ogtitle = REPLACE(ogtitle, CHR(146), '''')
WHERE ogtitle LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET ogtitle = REPLACE(ogtitle, CHR(145), '''')
WHERE ogtitle LIKE '%' || CHR(145) || '%';

UPDATE girls 
SET ogdescription = REPLACE(ogdescription, CHR(146), '''')
WHERE ogdescription LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET ogdescription = REPLACE(ogdescription, CHR(145), '''')
WHERE ogdescription LIKE '%' || CHR(145) || '%';

UPDATE girls 
SET h1title = REPLACE(h1title, CHR(146), '''')
WHERE h1title LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET h1title = REPLACE(h1title, CHR(145), '''')
WHERE h1title LIKE '%' || CHR(145) || '%';

UPDATE girls 
SET h2title = REPLACE(h2title, CHR(146), '''')
WHERE h2title LIKE '%' || CHR(146) || '%';

UPDATE girls 
SET h2title = REPLACE(h2title, CHR(145), '''')
WHERE h2title LIKE '%' || CHR(145) || '%';

-- Fix double quotation marks
UPDATE girls 
SET sources = REPLACE(sources, CHR(147), '"')
WHERE sources LIKE '%' || CHR(147) || '%';

UPDATE girls 
SET sources = REPLACE(sources, CHR(148), '"')
WHERE sources LIKE '%' || CHR(148) || '%';

UPDATE girls 
SET introtext = REPLACE(introtext, CHR(147), '"')
WHERE introtext LIKE '%' || CHR(147) || '%';

UPDATE girls 
SET introtext = REPLACE(introtext, CHR(148), '"')
WHERE introtext LIKE '%' || CHR(148) || '%';

-- Fix dashes
UPDATE girls 
SET sources = REPLACE(sources, CHR(150), '-')
WHERE sources LIKE '%' || CHR(150) || '%';

UPDATE girls 
SET sources = REPLACE(sources, CHR(151), '--')
WHERE sources LIKE '%' || CHR(151) || '%';

UPDATE girls 
SET introtext = REPLACE(introtext, CHR(150), '-')
WHERE introtext LIKE '%' || CHR(150) || '%';

UPDATE girls 
SET introtext = REPLACE(introtext, CHR(151), '--')
WHERE introtext LIKE '%' || CHR(151) || '%';

COMMIT;

-- Verify the fix
SELECT COUNT(*) as remaining_issues 
FROM girls 
WHERE (sources LIKE '%' || CHR(145) || '%' OR sources LIKE '%' || CHR(146) || '%'
    OR introtext LIKE '%' || CHR(145) || '%' OR introtext LIKE '%' || CHR(146) || '%'
    OR seotitle LIKE '%' || CHR(145) || '%' OR seotitle LIKE '%' || CHR(146) || '%'
    OR metadescription LIKE '%' || CHR(145) || '%' OR metadescription LIKE '%' || CHR(146) || '%');

