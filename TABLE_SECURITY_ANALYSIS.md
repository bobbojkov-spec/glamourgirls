# Database Table Security Analysis

## Summary
**Total tables flagged: 31**  
**Tables in active use: 8**  
**Tables to DELETE (unused/old): 23**

---

## ✅ TABLES IN ACTIVE USE (Enable RLS)

These tables are actively used and need Row Level Security enabled:

### 1. `girls` ⚠️ **CRITICAL**
- **Usage**: Main actress/profile table
- **Found in**: 
  - `src/app/api/admin/girls/**/*`
  - `src/app/api/actresses/**/*`
  - `src/app/admin/girls/**/*`
  - `src/app/actress/**/*`
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **RLS Recommendation**: 
  - SELECT: Public (anon) - for viewing published actresses
  - INSERT/UPDATE/DELETE: Authenticated admin only

### 2. `images` ⚠️ **CRITICAL**
- **Usage**: Main images table (gallery, HQ, thumbnails)
- **Found in**: 
  - `src/app/api/admin/images/**/*`
  - `src/app/api/admin/generate-collage/route.ts`
  - `src/app/api/actresses/**/*`
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **RLS Recommendation**:
  - SELECT: Public (anon) - for viewing published images
  - INSERT/UPDATE/DELETE: Authenticated admin only

### 3. `girlinfos` ⚠️ **CRITICAL**
- **Usage**: Actress bio/info text (shrttext, lngtext)
- **Found in**: 
  - `src/app/api/admin/girls/[id]/route.ts`
  - `src/app/admin/girls/[id]/page.tsx`
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **RLS Recommendation**:
  - SELECT: Public (anon) - for viewing published actress info
  - INSERT/UPDATE/DELETE: Authenticated admin only

### 4. `girllinks` ⚠️ **CRITICAL**
- **Usage**: Links, books, sources for actresses
- **Found in**: 
  - `src/app/api/admin/girls/[id]/route.ts`
  - `src/app/admin/girls/[id]/page.tsx`
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **RLS Recommendation**:
  - SELECT: Public (anon) - for viewing published links
  - INSERT/UPDATE/DELETE: Authenticated admin only

### 5. `admin_users` 🔒 **SECURITY CRITICAL**
- **Usage**: Admin user accounts
- **Found in**: 
  - `src/app/api/admin/auth/**/*`
  - `src/app/api/admin/users/**/*`
- **Operations**: SELECT (for login/verification)
- **RLS Recommendation**:
  - SELECT: Service role only (NO public access)
  - Should NOT be accessible via PostgREST anon key

### 6. `admin_sessions` 🔒 **SECURITY CRITICAL**
- **Usage**: Admin user sessions
- **Found in**: Admin authentication system
- **Operations**: SELECT, INSERT, UPDATE, DELETE
- **RLS Recommendation**:
  - All operations: Service role only
  - Should NOT be accessible via PostgREST anon key

### 7. `admin_login_codes` 🔒 **SECURITY CRITICAL**
- **Usage**: Temporary login codes for admin authentication
- **Found in**: `src/app/api/admin/auth/login-start/route.ts`
- **Operations**: SELECT, INSERT, DELETE (expired codes)
- **RLS Recommendation**:
  - All operations: Service role only
  - Should NOT be accessible via PostgREST anon key

### 8. `views_log` ✅ **USED**
- **Usage**: Tracking actress profile views
- **Found in**: 
  - `src/app/api/actresses/[id]/track-view/route.ts`
  - `src/app/api/admin/girls-stats/route.ts`
- **Operations**: INSERT (track views), SELECT (stats)
- **RLS Recommendation**:
  - INSERT: Public (anon) - for tracking views
  - SELECT: Authenticated admin only - for viewing stats

---

## ❌ TABLES TO DELETE (Not Found in Codebase)

These tables appear to be from an old project and are NOT used anywhere in the current codebase:

### Old/Unused Tables (Safe to Drop):

1. **`related_actresses`** - No references found
2. **`stats`** - Only found as variable name, not table name
3. **`subimages2`** - No references found
4. **`subs`** - No references found
5. **`test`** - No references found (test files don't count)
6. **`types`** - No references found
7. **`zaiavki`** - No references found (Russian: "requests/orders" - old table)
8. **`zaiavki_copy`** - No references found
9. **`zaiavkidet`** - No references found (old detail table)
10. **`zaiavkidet_copy`** - No references found
11. **`anon_stats`** - No references found
12. **`country`** - No references found
13. **`credits`** - No references found (payment system changed)
14. **`credits_buying`** - No references found
15. **`favorites`** - No references found (using localStorage/context instead)
16. **`girl_favorites`** - No references found
17. **`girlinfos2`** - No references found (only `girlinfos` is used)
18. **`images2`** - No references found (only `images` is used)
19. **`img_downloads`** - No references found (downloads tracked in JSON files: `data/downloads.json`)
20. **`info_transaction`** - No references found
21. **`newsletter2_running`** - No references found
22. **`newsletter2_states`** - No references found
23. **`newsletters2_sended`** - No references found
24. **`prava`** - No references found (Russian: "rights/permissions" - old table)

---

## 🔧 Action Items

### Phase 1: Enable RLS on Active Tables (Priority Order)

#### High Priority (Critical Security):
1. `admin_users` - Move to service role only access
2. `admin_sessions` - Move to service role only access  
3. `admin_login_codes` - Move to service role only access

#### Medium Priority (Public Data with Admin Write):
4. `girls` - Public SELECT, Admin INSERT/UPDATE/DELETE
5. `images` - Public SELECT, Admin INSERT/UPDATE/DELETE
6. `girlinfos` - Public SELECT, Admin INSERT/UPDATE/DELETE
7. `girllinks` - Public SELECT, Admin INSERT/UPDATE/DELETE

#### Low Priority (Analytics):
8. `views_log` - Public INSERT (for tracking), Admin SELECT (for stats)

### Phase 2: Delete Unused Tables

**⚠️ BACKUP DATABASE FIRST!**

Run these SQL commands in Supabase SQL Editor to drop unused tables:

```sql
-- Drop unused tables (backup first!)
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
```

---

## 📋 RLS Policy Examples

### Example 1: Public Read, Admin Write (girls table)
```sql
-- Enable RLS
ALTER TABLE girls ENABLE ROW LEVEL SECURITY;

-- Allow public to read published girls
CREATE POLICY "Public can view published girls"
  ON girls FOR SELECT
  USING (published = 2);

-- Allow authenticated admins to do everything
CREATE POLICY "Admins can manage girls"
  ON girls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_sessions
      WHERE admin_sessions.admin_id = auth.uid()
      AND admin_sessions.expires_at > NOW()
    )
  );
```

### Example 2: Service Role Only (admin_users)
```sql
-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- No public/anon access - service role only
-- This table should only be accessed via service role key, not anon key
```

### Example 3: Public Insert, Admin Read (views_log)
```sql
-- Enable RLS
ALTER TABLE views_log ENABLE ROW LEVEL SECURITY;

-- Allow public to insert views
CREATE POLICY "Public can track views"
  ON views_log FOR INSERT
  WITH CHECK (true);

-- Allow admins to read stats
CREATE POLICY "Admins can view stats"
  ON views_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_sessions
      WHERE admin_sessions.admin_id = auth.uid()
      AND admin_sessions.expires_at > NOW()
    )
  );
```

---

## 🔍 Verification

After deleting tables, verify in Supabase:
1. Go to Table Editor
2. Confirm only active tables remain
3. Re-run the linter to verify RLS warnings are resolved
4. Test application functionality to ensure nothing broke

