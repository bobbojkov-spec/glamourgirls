-- Drop Unused Database Tables
-- 
-- ⚠️  WARNING: BACKUP YOUR DATABASE FIRST!
-- 
-- This script drops 24 unused tables that were identified as not being
-- used in the current codebase. These appear to be from an old project.
--
-- Run this in Supabase SQL Editor after backing up your database.

-- Drop unused tables (in dependency order to avoid foreign key issues)
DROP TABLE IF EXISTS related_actresses CASCADE;
DROP TABLE IF EXISTS stats CASCADE;
DROP TABLE IF EXISTS subimages2 CASCADE;
DROP TABLE IF EXISTS subs CASCADE;
DROP TABLE IF EXISTS test CASCADE;
DROP TABLE IF EXISTS types CASCADE;
DROP TABLE IF EXISTS zaiavki CASCADE;
DROP TABLE IF EXISTS zaiavki_copy CASCADE;
DROP TABLE IF EXISTS zaiavkidet CASCADE;
DROP TABLE IF EXISTS zaiavkidet_copy CASCADE;
DROP TABLE IF EXISTS anon_stats CASCADE;
DROP TABLE IF EXISTS country CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS credits_buying CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS girl_favorites CASCADE;
DROP TABLE IF EXISTS girlinfos2 CASCADE;
DROP TABLE IF EXISTS images2 CASCADE;
DROP TABLE IF EXISTS img_downloads CASCADE;
DROP TABLE IF EXISTS info_transaction CASCADE;
DROP TABLE IF EXISTS newsletter2_running CASCADE;
DROP TABLE IF EXISTS newsletter2_states CASCADE;
DROP TABLE IF EXISTS newsletters2_sended CASCADE;
DROP TABLE IF EXISTS prava CASCADE;

-- Verify deletions
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

