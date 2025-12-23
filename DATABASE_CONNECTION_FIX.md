# Database Connection Pool Fix - "Too Many Connections" Error

## ✅ THE FIX THAT WORKS

**When you see "Too many connections" error, do this:**

```bash
# Restart MySQL - clears ALL connections immediately
brew services restart mysql  # macOS
# OR
sudo systemctl restart mysql  # Linux
```

**That's it!** This fixes it every time. The pool settings are already correct.

---

## Problem
MySQL error: `ER_CON_COUNT_ERROR` - "Too many connections"
- Happens when connection pool exhausts MySQL's max connections
- Common in Next.js development with hot reloading
- Multiple API routes creating connections simultaneously
- **ROOT CAUSE**: MySQL server itself is exhausted, not just our pool

## Solution Applied

### 1. Minimal Connection Pool
**File:** `src/lib/db.ts`

- **connectionLimit: 1** - Only 1 connection maximum (was 5, then 2)
- **waitForConnections: false** - Fail immediately if no connection available
- **maxIdle: 0** - Keep NO idle connections, close immediately after use
- **idleTimeout: 3000** - Close idle connections after 3 seconds (was 5)
- **queueLimit: 0** - Don't queue requests, fail fast
- **acquireTimeout: 5000** - 5 second timeout to acquire connection

### 2. Aggressive Pool Cleanup
- Pool recreation: Every 5 minutes (was 30 minutes)
- Automatic pool reset on `ER_CON_COUNT_ERROR`
- Proper connection cleanup on errors

### 3. Error Handling
**File:** `src/app/api/test-query/route.ts`

- Detects `ER_CON_COUNT_ERROR` and automatically resets pool
- Provides clear error messages with suggestions
- Returns helpful error details to client

### 4. Helper Functions
- `resetPool()` - Manually reset connection pool
- `query()` - Wrapper with automatic pool reset on connection errors

## Key Settings Summary

```typescript
{
  connectionLimit: 1,        // MINIMUM - only 1 connection
  waitForConnections: false, // Don't wait, fail fast
  maxIdle: 0,                // No idle connections
  idleTimeout: 3000,         // 3 seconds
  queueLimit: 0,             // No queuing
  acquireTimeout: 5000,      // 5 seconds
}
```

## How to Fix If It Happens Again

### ✅ PRIMARY FIX (ALWAYS WORKS):
```bash
brew services restart mysql  # macOS
# OR
sudo systemctl restart mysql  # Linux
```
**This is the fix. It works every time. Just restart MySQL.**

### Alternative (if restart doesn't work):
1. Kill connections: `npx tsx scripts/kill-mysql-connections.ts`
2. Check status: `npx tsx scripts/check-mysql-connections.ts`
3. Restart Next.js dev server (clears pool instances)

### If Persistent:
- Check MySQL max_connections: `SHOW VARIABLES LIKE 'max_connections';`
- Consider increasing MySQL max_connections if legitimate need
- Check for other processes holding connections

## Diagnostic Script
`scripts/check-mysql-connections.ts` - Shows current connection status and usage

## Remember
- **connectionLimit: 1** is the key setting
- **maxIdle: 0** prevents idle connections from accumulating
- Pool auto-resets on `ER_CON_COUNT_ERROR`
- This is a conservative approach - trades performance for reliability

