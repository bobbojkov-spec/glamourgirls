# Featured Actresses Management System

## Overview
This system allows admins to manually curate exactly 4 featured actresses for the homepage, replacing random selection with editorial control.

## Database Migration

### Step 1: Run the Migration
Execute the SQL migration to add the required columns:

```bash
# Option 1: Using psql
psql $DATABASE_URL -f scripts/add-featured-actresses-columns.sql

# Option 2: Using Supabase SQL Editor
# Copy and paste the contents of scripts/add-featured-actresses-columns.sql
# into the Supabase Dashboard → SQL Editor
```

### Step 2: Verify Migration
Check that the columns were added:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'girls' 
  AND column_name IN ('is_featured', 'featured_order');
```

## Admin Interface

### Access
Navigate to: `/admin/featured-actresses`

The page is accessible from the admin sidebar under "Featured Actresses".

### Features
- **Visual Grid Layout**: All actresses displayed in a card grid with thumbnails
- **Toggle Featured Status**: Switch to mark actresses as featured
- **Position Selection**: Dropdown to assign featured order (1-4)
- **Validation**: 
  - Maximum 4 actresses can be featured
  - Featured order must be unique (1-4)
  - Clear error messages for invalid states
- **Featured Counter**: Shows "Featured: X / 4" at the top
- **Visual Highlighting**: Featured actresses have green borders and background

### Usage
1. Browse all actresses in the grid
2. Toggle "Featured" switch for actresses you want to feature
3. Select position (1-4) from the dropdown for each featured actress
4. Click "Save Changes" to persist your selection
5. The homepage will automatically display your curated selection

## API Endpoints

### GET `/api/admin/featured-actresses`
Returns all actresses with their featured status and gallery images.

**Response:**
```json
{
  "actresses": [
    {
      "id": 1,
      "name": "Actress Name",
      "isFeatured": true,
      "featuredOrder": 1,
      "galleryImageUrl": "https://..."
    }
  ],
  "featuredCount": 2,
  "maxFeatured": 4
}
```

### POST `/api/admin/featured-actresses`
Updates featured status for multiple actresses.

**Request Body:**
```json
{
  "updates": [
    {
      "id": 1,
      "isFeatured": true,
      "featuredOrder": 1
    },
    {
      "id": 2,
      "isFeatured": false,
      "featuredOrder": null
    }
  ]
}
```

**Validation:**
- Maximum 4 actresses can be featured
- Featured order must be unique (1-4)
- Featured order must be between 1 and 4

## Frontend Integration

### Homepage Display
The `/front2` page automatically:
- Fetches only actresses where `is_featured = true`
- Orders by `featured_order ASC`
- Limits to exactly 4 items
- Displays only available featured actresses (no auto-fill)

### Data Model
The `SearchActressResult` interface includes:
- `isFeatured?: boolean` - Featured status
- `featuredOrder?: number | null` - Display order (1-4)

## Database Schema

### New Columns
- `is_featured` (BOOLEAN, default false)
- `featured_order` (INTEGER, nullable, 1-4)

### Constraints
- `check_featured_order_range`: Ensures featured_order is 1-4 or NULL
- `idx_girls_featured_order_unique`: Prevents duplicate featured_order values

### Indexes
- `idx_girls_is_featured`: For faster queries on featured status
- `idx_girls_featured_order`: For faster ordering

## Troubleshooting

### Migration Errors
If the migration fails:
1. Check that you have ALTER TABLE permissions
2. Verify the `girls` table exists
3. Check for existing columns (migration uses `IF NOT EXISTS`)

### API Errors
- **"Cannot feature more than 4 actresses"**: Reduce the number of featured actresses
- **"Duplicate featured_order values"**: Ensure each featured actress has a unique position (1-4)
- **"featured_order must be between 1 and 4"**: Use only values 1, 2, 3, or 4

### Display Issues
- If no featured actresses appear: Check that actresses are marked as featured in the admin
- If order is wrong: Verify `featured_order` values are set correctly (1-4)
- If images don't load: Ensure actresses have gallery images (mytp = 4)

## Future Enhancements
- Drag-and-drop reordering
- Bulk selection tools
- Featured actresses history/audit log
- Scheduled featured rotations

