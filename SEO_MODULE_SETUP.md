# SEO Module - Complete Setup Guide

## ✅ Implementation Status

All components have been created and integrated. Follow these steps to activate:

## Step 1: Run Database Migrations

```bash
cd gg26

# Run the main SEO schema migration
mysql -u root -p glamourgirls < scripts/migrate-seo-schema-safe.sql

# Add SEO status tracking fields
mysql -u root -p glamourgirls < scripts/add-seo-status-fields.sql
```

## Step 2: Verify Integration

The following files have been updated:
- ✅ `src/components/admin/girls/GirlForm.tsx` - Uses `SEOFormSectionEnhanced`
- ✅ `src/app/admin/girls/[id]/page.tsx` - Loads SEO data
- ✅ `src/app/api/admin/girls/[id]/route.ts` - Saves/loads SEO data

## Step 3: Test the Module

1. **Open Admin Panel**: Navigate to `/admin/girls/[id]` for any actress
2. **View SEO Section**: Scroll to "SEO & Meta Tags" section
3. **Auto-Generate**: Click "Auto-Generate" button
4. **Review Status**: Check the color-coded status (red/yellow/green)
5. **Edit Manually**: Modify any field and see real-time validation
6. **Save**: Click "Save SEO" to persist changes

## API Endpoints

The module uses these endpoints (note: using `girls` not `actress` to match existing structure):

- **GET** `/api/admin/girls/[id]/seo` - Fetch SEO data
- **POST** `/api/admin/girls/[id]/seo` - Save SEO data  
- **POST** `/api/admin/girls/[id]/seo/auto-generate` - Auto-generate SEO

## Features

### ✅ Auto-Generation
- Extracts movie titles from timeline events
- Uses gallery count for descriptions
- Generates era-appropriate content
- Creates optimal-length titles and descriptions

### ✅ Real-Time Validation
- Character count for title (30-60, optimal 50-60)
- Character count for description (120-160, optimal 150-160)
- Word count for intro (100-220, optimal 180-220)
- Visual indicators: ✓ (green), ⚠ (yellow), ✗ (red)

### ✅ Status Scoring
- **RED**: Missing required fields or below minimums
- **YELLOW**: All fields present but not optimal
- **GREEN**: All fields optimal and complete

## Database Fields

All fields are stored in the `girls` table:
- `seo_title` - SEO title (0-60 chars)
- `meta_description` - SEO description (0-160 chars)
- `meta_keywords` - Comma-separated keywords
- `h1_title` - Required H1 headline
- `intro_text` - Introduction (100-220 words)
- `og_title` - Open Graph title
- `og_description` - Open Graph description
- `og_image` - Open Graph image URL
- `canonical_url` - Canonical URL
- `seo_status` - Status enum (red/yellow/green)
- `auto_generated` - Boolean flag
- `last_auto_generate` - Timestamp

## Troubleshooting

### SEO Section Not Showing
- Ensure the actress entry is saved first (has an ID)
- Check browser console for errors
- Verify database migrations ran successfully

### Auto-Generate Not Working
- Check API endpoint is accessible
- Verify actress has timeline events or gallery images
- Check browser console for error messages

### Status Always Red
- Ensure all required fields are filled
- Check character/word counts meet minimums
- Verify H1 title and OG image are set

## Next Steps

1. Run migrations (Step 1)
2. Test on a few actress entries
3. Review auto-generated content
4. Manually refine as needed
5. Use "Save SEO" to persist changes

The module is fully integrated and ready to use!

