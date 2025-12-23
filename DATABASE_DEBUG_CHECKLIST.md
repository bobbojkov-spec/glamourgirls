# Database Debug Checklist

## What I've Added

### 1. Database Connection Logging (`src/lib/db.ts`)
- Logs database host, user, database name on pool creation
- Shows which database is being connected to

### 2. Search API Logging (`src/app/api/actresses/route.ts`)
- Logs total count of published actresses before query
- Logs the exact SQL query being executed
- Logs query parameters
- Logs number of results returned

### 3. Detail API Logging (`src/app/api/actresses/[id]/route.ts`)
- Logs total count of published actresses
- Logs which actress ID is being fetched
- Logs number of results found
- Checks if actress exists but is unpublished

## Next Steps - Check Server Console

When you visit `/actress/3/jill-adams` or `/search?keyword=adam`, check your **server terminal** for:

### Expected Logs:

1. **Database Configuration:**
   ```
   🔌 Database Configuration:
     Host: localhost (or your DB host)
     User: root (or your DB user)
     Database: glamourgirls (or your DB name)
     Password: *** (or empty)
   ```

2. **Total Count Check:**
   ```
   📊 Total published actresses in database: X
   ```
   - If this is `0`, the database is empty or all records have `published != 2`
   - If this shows a number > 0, data exists but query filters are wrong

3. **Query Execution:**
   ```
   🔍 Executing query: SELECT ...
   📝 Query params: [...]
   ✅ Query returned X results
   ```

4. **Actress Detail:**
   ```
   🔍 Fetching actress ID: 3
   ✅ Found 1 actress(es) with ID 3
   ```
   - If `Found 0`, check if actress exists with different `published` value

## Common Issues to Check

### Issue 1: Wrong Database
- Check if `DB_NAME` env var points to correct database
- Verify database has data: `SELECT COUNT(*) FROM girls WHERE published = 2;`

### Issue 2: All Records Unpublished
- Check: `SELECT COUNT(*) FROM girls;` (all records)
- Check: `SELECT COUNT(*) FROM girls WHERE published = 2;` (published only)
- If first > 0 but second = 0, records exist but aren't published

### Issue 3: Database Connection Failed
- Check MySQL is running: `mysql -u root -p`
- Check credentials in `.env` file
- Check network/firewall if using remote DB

### Issue 4: Table/Column Missing
- Error will show in console: `Table 'X' doesn't exist` or `Unknown column 'Y'`
- Verify schema matches expected structure

## Direct Database Test

Run this in MySQL to verify data:

```sql
-- Check total records
SELECT COUNT(*) as total FROM girls;

-- Check published records
SELECT COUNT(*) as published FROM girls WHERE published = 2;

-- Check specific actress
SELECT id, nm, firstname, familiq, published FROM girls WHERE id = 3;

-- Check for "adam" in names
SELECT id, nm, firstname, familiq FROM girls 
WHERE (nm LIKE '%adam%' OR firstname LIKE '%adam%' OR familiq LIKE '%adam%')
AND published = 2;
```

## What to Report

After checking server logs, report:
1. What database configuration is shown?
2. What is the total count of published actresses?
3. What error messages appear (if any)?
4. What does the direct SQL query return?

