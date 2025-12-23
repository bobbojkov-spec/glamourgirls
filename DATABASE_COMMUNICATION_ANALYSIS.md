# Database Communication Analysis: Original vs Current

## Key Differences Found

### 1. **Base URL Resolution**

**ORIGINAL:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
```

**CURRENT:**
```typescript
const resolveBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};
```

**⚠️ POTENTIAL ISSUE:**
- The `resolveBaseUrl()` function checks `process.env.BASE_URL` (without `NEXT_PUBLIC_` prefix)
- In Next.js server components, `NEXT_PUBLIC_*` vars are available, but regular env vars might not be
- If `BASE_URL` is set but `NEXT_PUBLIC_BASE_URL` is not, it might return a URL that doesn't work
- The function also checks `VERCEL_URL` which might return a production URL when running locally

### 2. **Error Handling**

**ORIGINAL:**
```typescript
if (!res.ok) {
  throw new Error('Failed to fetch actress');
}
// ... later in catch block
return null;
```

**CURRENT:**
```typescript
if (!res.ok) {
  console.warn(`Actress not available: ${id} (${res.status})`);
  return null;  // Returns null directly, no throw
}
```

**Analysis:**
- Both approaches end up returning `null` when the API fails
- The original throws and catches, current returns directly
- This shouldn't cause database issues, but might affect error visibility

### 3. **Response Handling**

**ORIGINAL:**
```typescript
return await res.json();
```

**CURRENT:**
```typescript
const data = await res.json();
// ... logging ...
return data;
```

**Analysis:**
- Functionally the same, just adds logging
- Shouldn't cause issues

## Root Cause Analysis

### Most Likely Issue: **Base URL Resolution**

The `resolveBaseUrl()` function might be:
1. **Returning wrong URL**: If `BASE_URL` env var is set to something incorrect, it will use that instead of localhost
2. **Server-side fetch issue**: If the function returns a URL that the server can't reach (like an external URL), the fetch will fail
3. **Environment variable precedence**: The order of checks might cause it to use `VERCEL_URL` in development

### How to Verify:

1. **Check what URL is being used:**
   ```typescript
   const baseUrl = resolveBaseUrl();
   console.log('Fetching from:', baseUrl);
   ```

2. **Check environment variables:**
   - Is `NEXT_PUBLIC_BASE_URL` set?
   - Is `BASE_URL` set? (this might override)
   - Is `VERCEL_URL` set? (this would use production URL)

3. **Test the API directly:**
   ```bash
   curl http://localhost:3000/api/actresses/3
   ```

## Recommended Fix

**Option 1: Revert to original baseUrl logic**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
```

**Option 2: Fix resolveBaseUrl to prioritize correctly**
```typescript
const resolveBaseUrl = () => {
  // In development, always use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // In production, check NEXT_PUBLIC_BASE_URL first
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Fallback to VERCEL_URL only in production
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
};
```

## Database Communication Flow

Both versions use the same API endpoint: `/api/actresses/[id]`

The API route:
1. ✅ Uses `pool.execute()` to query database
2. ✅ Fetches from `girls` table with `published = 2` filter
3. ✅ Returns 404 if actress not found
4. ✅ Returns 500 on database errors

**The database communication itself hasn't changed** - the issue is likely in how the page calls the API.

## Conclusion

**The problem is most likely in `resolveBaseUrl()` returning an incorrect URL**, causing the fetch to fail before it even reaches the database.

