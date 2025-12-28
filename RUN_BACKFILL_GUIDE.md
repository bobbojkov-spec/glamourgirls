# How to Run the Order Num Backfill Script

## Prerequisites
- You must be logged in as an admin in your browser
- The application must be running (local dev server or production)

## Method 1: Using Browser DevTools (Easiest)

1. **Open your browser** and navigate to your admin panel (e.g., `http://localhost:3000/admin`)

2. **Log in** if you're not already logged in

3. **Open Browser DevTools** (F12 or Right-click → Inspect)

4. **Go to the Console tab**

5. **Run this JavaScript code**:
   ```javascript
   // Step 1: Run the backfill
   fetch('/api/admin/images/backfill-order-num', {
     method: 'POST',
     credentials: 'include',
     headers: {
       'Content-Type': 'application/json',
     },
   })
   .then(response => response.json())
   .then(data => {
     console.log('Backfill Result:', data);
     if (data.success) {
       console.log('✅ SUCCESS!', data.message);
       console.log(`Processed ${data.updated} images across ${data.girlsProcessed} girls`);
     } else {
       console.error('❌ FAILED:', data.error);
     }
   })
   .catch(error => {
     console.error('Error:', error);
   });

   // Step 2: After backfill completes, verify the results
   setTimeout(() => {
     fetch('/api/admin/images/backfill-order-num', {
       method: 'GET',
       credentials: 'include',
     })
     .then(response => response.json())
     .then(data => {
       console.log('Verification Result:', data);
       if (data.withoutOrder === 0 && data.isComplete) {
         console.log('✅ VERIFICATION PASSED: All images have order_num!');
       } else {
         console.warn('⚠️ VERIFICATION FAILED:', data);
       }
     });
   }, 2000);
   ```

## Method 2: Using curl (Command Line)

If you have your admin session cookie:

```bash
# Replace COOKIE_VALUE with your actual admin session cookie
# You can get it from browser DevTools → Application → Cookies → admin-session (or similar)

curl -X POST http://localhost:3000/api/admin/images/backfill-order-num \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=YOUR_COOKIE_VALUE_HERE" \
  --cookie-jar cookies.txt

# Then verify:
curl -X GET http://localhost:3000/api/admin/images/backfill-order-num \
  -H "Cookie: admin-session=YOUR_COOKIE_VALUE_HERE"
```

## Method 3: Create an Admin Dashboard Button (Recommended for Production)

You can add a button to your admin dashboard. Add this to your admin page:

```tsx
// Add to src/app/admin/page.tsx or create a new component

import { Button, Card, Space, Typography, Alert } from 'antd';

async function handleBackfill() {
  try {
    const response = await fetch('/api/admin/images/backfill-order-num', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    if (data.success) {
      alert(`✅ Success! ${data.message}`);
    } else {
      alert(`❌ Failed: ${data.error}`);
    }
  } catch (error) {
    alert(`Error: ${error}`);
  }
}
```

## Method 4: Direct Database Access (If you have DB access)

If you have direct PostgreSQL access, you can run the backfill logic directly, but it's safer to use the API endpoint.

## Expected Output

### Success Response:
```json
{
  "success": true,
  "message": "Successfully backfilled order_num for 150 images across 25 girls",
  "processed": 150,
  "updated": 150,
  "girlsProcessed": 25,
  "remainingNulls": 0
}
```

### Verification Response:
```json
{
  "total": 150,
  "withOrder": 150,
  "withoutOrder": 0,
  "isComplete": true
}
```

## After Backfill Succeeds

Once `withoutOrder = 0` and `isComplete = true`, you can safely run the migration SQL:

```bash
psql -d your_database -f scripts/migrations/add-order-num-not-null-constraint.sql
```

Or run it through your database admin tool (pgAdmin, DBeaver, etc.).

## Troubleshooting

- **401 Unauthorized**: Make sure you're logged in as an admin
- **500 Error**: Check server logs for details
- **Backfill incomplete**: Check which girls have issues in the error array
- **Still has NULLs after backfill**: The script should rollback if any remain - check logs

