# Supabase Storage Policy Setup

## REQUIRED: Add Storage Policy

To enable signed URLs to function with a PRIVATE bucket, you MUST add this policy in the Supabase SQL Editor:

```sql
CREATE POLICY "Service role can read storage"
ON storage.objects
FOR SELECT
USING (auth.role() = 'service_role');
```

**Important Notes:**
- This policy enables the service role (your backend) to read from private buckets
- This does NOT make the bucket public
- This does NOT allow anonymous access
- Only the service role (using SUPABASE_SERVICE_ROLE_KEY) can access files
- Frontend users will still need signed URLs to access files

## How It Works

1. **Private Bucket**: Bucket remains private - no public access
2. **Service Role**: Backend uses `SUPABASE_SERVICE_ROLE_KEY` to create signed URLs
3. **Signed URLs**: Frontend receives temporary signed URLs (expire in 60-300 seconds)
4. **Security**: No direct bucket access, only via signed URLs

## Verification

After adding the policy:
1. Thumbnails should render on `/download` page
2. Downloads should work when clicking "Download HQ"
3. No 403 errors in browser console
4. Bucket remains private in Supabase dashboard

