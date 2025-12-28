# Simple Steps to Run Backfill

## Quick Method (Type Manually)

1. Open browser DevTools Console (F12)
2. Type: `allow pasting` and press Enter
3. Then paste the code below

## Or Type Manually (No Pasting Needed)

Type these commands one at a time:

```javascript
fetch('/api/admin/images/backfill-order-num', {method: 'POST', credentials: 'include'}).then(r => r.json()).then(d => console.log(d))
```

Wait for the result, then verify:

```javascript
fetch('/api/admin/images/backfill-order-num', {method: 'GET', credentials: 'include'}).then(r => r.json()).then(d => console.log(d))
```

## What You Should See

**After POST (backfill):**
```json
{
  "success": true,
  "message": "Successfully backfilled order_num for X images across Y girls",
  "updated": 150,
  "girlsProcessed": 25,
  "remainingNulls": 0
}
```

**After GET (verification):**
```json
{
  "total": 150,
  "withOrder": 150,
  "withoutOrder": 0,
  "isComplete": true
}
```

If `withoutOrder = 0`, you're ready to run the migration SQL!

