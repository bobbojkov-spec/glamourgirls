-- Drop legacy/unused tables (local/source Postgres)
-- Safe to run multiple times (uses IF EXISTS).
-- IMPORTANT: Run this only AFTER migration is finished and verified.

BEGIN;

-- Members / legacy members tables
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS members_2009 CASCADE;
DROP TABLE IF EXISTS members_2011 CASCADE;

-- Newsletter-related tables (various historical names)
DROP TABLE IF EXISTS newsletter CASCADE;
DROP TABLE IF EXISTS newsletter2 CASCADE;
DROP TABLE IF EXISTS newsletter2_filter CASCADE;
DROP TABLE IF EXISTS newsletter2_images CASCADE;
DROP TABLE IF EXISTS newsletter2_running CASCADE;
DROP TABLE IF EXISTS newsletter2_states CASCADE;
DROP TABLE IF EXISTS newslettermembers CASCADE;
DROP TABLE IF EXISTS newsletters2_sended CASCADE;

-- Also drop common alternate spellings if they exist
DROP TABLE IF EXISTS newsletter2_run CASCADE;
DROP TABLE IF EXISTS newsletter2_stats CASCADE;
DROP TABLE IF EXISTS newsletters2_sent CASCADE;

COMMIT;



