-- Enable Row Level Security (RLS) on Active Tables
-- 
-- This script enables RLS and creates policies for all active tables
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PUBLIC TABLES: girls, images, girlinfos, girllinks
-- These allow public read access for published content, admin write access
-- ============================================================================

-- Enable RLS on girls table
ALTER TABLE girls ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read published girls
DROP POLICY IF EXISTS "Public can view published girls" ON girls;
CREATE POLICY "Public can view published girls"
  ON girls FOR SELECT
  USING (published = 2);

-- Policy: Admins can manage all girls (using service role or custom auth check)
-- Note: Adjust this based on your admin authentication method
DROP POLICY IF EXISTS "Admins can manage girls" ON girls;
CREATE POLICY "Admins can manage girls"
  ON girls FOR ALL
  USING (false); -- Default deny - admins use service role key which bypasses RLS
  -- If using Supabase auth, replace with:
  -- USING (auth.role() = 'service_role' OR EXISTS (
  --   SELECT 1 FROM admin_sessions 
  --   WHERE admin_sessions.admin_id = auth.uid() 
  --   AND admin_sessions.expires_at > NOW()
  -- ));

-- Enable RLS on images table
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read images for published girls
DROP POLICY IF EXISTS "Public can view images for published girls" ON images;
CREATE POLICY "Public can view images for published girls"
  ON images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM girls 
      WHERE girls.id = images.girlid 
      AND girls.published = 2
    )
  );

-- Policy: Admins can manage all images
DROP POLICY IF EXISTS "Admins can manage images" ON images;
CREATE POLICY "Admins can manage images"
  ON images FOR ALL
  USING (false); -- Default deny - admins use service role key

-- Enable RLS on girlinfos table
ALTER TABLE girlinfos ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read info for published girls
DROP POLICY IF EXISTS "Public can view info for published girls" ON girlinfos;
CREATE POLICY "Public can view info for published girls"
  ON girlinfos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM girls 
      WHERE girls.id = girlinfos.girlid 
      AND girls.published = 2
    )
  );

-- Policy: Admins can manage all girlinfos
DROP POLICY IF EXISTS "Admins can manage girlinfos" ON girlinfos;
CREATE POLICY "Admins can manage girlinfos"
  ON girlinfos FOR ALL
  USING (false); -- Default deny - admins use service role key

-- Enable RLS on girllinks table
ALTER TABLE girllinks ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read links for published girls
DROP POLICY IF EXISTS "Public can view links for published girls" ON girllinks;
CREATE POLICY "Public can view links for published girls"
  ON girllinks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM girls 
      WHERE girls.id = girllinks.girlid 
      AND girls.published = 2
    )
  );

-- Policy: Admins can manage all girllinks
DROP POLICY IF EXISTS "Admins can manage girllinks" ON girllinks;
CREATE POLICY "Admins can manage girllinks"
  ON girllinks FOR ALL
  USING (false); -- Default deny - admins use service role key

-- ============================================================================
-- VIEWS LOG: Allow public inserts for tracking, admin reads for stats
-- ============================================================================

-- Enable RLS on views_log table
ALTER TABLE views_log ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert view logs (for tracking)
DROP POLICY IF EXISTS "Public can track views" ON views_log;
CREATE POLICY "Public can track views"
  ON views_log FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can read view logs (for stats)
DROP POLICY IF EXISTS "Admins can view stats" ON views_log;
CREATE POLICY "Admins can view stats"
  ON views_log FOR SELECT
  USING (false); -- Default deny - admins use service role key

-- ============================================================================
-- ADMIN TABLES: Should be service role only (no public/anon access)
-- ============================================================================

-- Enable RLS on admin_users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Deny all public/anon access (service role only)
DROP POLICY IF EXISTS "No public access to admin_users" ON admin_users;
CREATE POLICY "No public access to admin_users"
  ON admin_users FOR ALL
  USING (false); -- Deny all - only accessible via service role key

-- Enable RLS on admin_sessions table
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Deny all public/anon access (service role only)
DROP POLICY IF EXISTS "No public access to admin_sessions" ON admin_sessions;
CREATE POLICY "No public access to admin_sessions"
  ON admin_sessions FOR ALL
  USING (false); -- Deny all - only accessible via service role key

-- Enable RLS on admin_login_codes table
ALTER TABLE admin_login_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Deny all public/anon access (service role only)
DROP POLICY IF EXISTS "No public access to admin_login_codes" ON admin_login_codes;
CREATE POLICY "No public access to admin_login_codes"
  ON admin_login_codes FOR ALL
  USING (false); -- Deny all - only accessible via service role key

-- ============================================================================
-- VERIFICATION: Check RLS status
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('girls', 'images', 'girlinfos', 'girllinks', 'views_log', 
                    'admin_users', 'admin_sessions', 'admin_login_codes')
ORDER BY tablename;

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('girls', 'images', 'girlinfos', 'girllinks', 'views_log', 
                    'admin_users', 'admin_sessions', 'admin_login_codes')
ORDER BY tablename, policyname;

