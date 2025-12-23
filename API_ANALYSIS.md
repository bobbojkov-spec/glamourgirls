# Actress Detail Page API Analysis

## API Endpoints

### 1. Main Actress Data: `/api/actresses/[id]`
**Route:** `src/app/api/actresses/[id]/route.ts`

**Returns:**
```json
{
  "id": 3,
  "name": "Jill Adams",           // Full name (from `nm` field)
  "firstName": "Jill",            // First name (from `firstname` field)
  "lastName": "Adams",             // Last name (from `familiq` field)
  "slug": "jill-adams",
  "era": "50s",
  "birthYear": 1930,
  "deathYear": 2008,
  "birthName": "Norma Jeane...",
  "timeline": [...],
  "images": {
    "gallery": [...],
    "hq": [...],
    "thumbnails": [...]
  },
  "relatedActresses": [...],
  "sources": "...",
  "links": [...],
  "books": [...]
}
```

**Database Query:**
- Fetches from `girls` table: `id, nm, firstname, middlenames, familiq, godini, slug, h1Title, intro_text`
- Fetches timeline from `girlinfos` table
- Fetches images from `images` table (mytp: 3=thumbnails, 4=gallery, 5=HQ)
- Fetches links/books from `girllinks` table

### 2. Headshot Image: `/api/actresses/[id]/headshot`
**Route:** `src/app/api/actresses/[id]/headshot/route.ts`

**Returns:** JPEG image with headers:
- `Content-Type: image/jpeg`
- `X-Image-Width: <width>`
- `X-Image-Height: <height>`
- `Cache-Control: public, max-age=31536000, immutable`

**Process:**
1. Checks for existing `headshot.jpg` in `public/newpic/[id]/` or `public/securepic/[id]/`
2. If not found, finds portrait-oriented GIF/PNG in those folders
3. Crops image (40px top, 40px bottom, 25px left, 28px right)
4. Converts to JPEG and saves as `headshot.jpg`
5. Returns the processed image

## Page Implementation

### Data Fetching
**File:** `src/app/actress/[id]/[slug]/page.tsx`

```typescript
// Fetch actress data
const actressData = await fetchActress(id);

// Extract name components
const actressName = actressData.name || 'Unknown';
const heroFirstName = actressData.firstName || ...;
const heroLastName = actressData.lastName || ...;

// Headshot URL
const heroImage = `/api/actresses/${id}/headshot`;
```

### Usage in Hero Section
```tsx
<img
  src={heroImage}  // `/api/actresses/3/headshot`
  alt={`${actressName} portrait`}
/>

<h1>
  <span>{heroFirstName}</span>  // "Jill"
  <span>{heroLastName}</span>    // "Adams"
</h1>
```

## Data Flow

1. **Page Load** → `fetchActress(id)` calls `/api/actresses/[id]`
2. **API Response** → Returns JSON with `name`, `firstName`, `lastName`, etc.
3. **Headshot** → `<img src="/api/actresses/[id]/headshot">` loads image
4. **Name Display** → Uses `firstName` and `lastName` from API response

## Current Status

✅ API routes are implemented
✅ Headshot endpoint processes images dynamically
✅ Name data is fetched and displayed
✅ Error handling with `notFound()` for missing actresses
✅ Development mock data fallback available

## Testing

To test the API:
```bash
# Test actress data endpoint
curl http://localhost:3000/api/actresses/3

# Test headshot endpoint (returns image)
curl -I http://localhost:3000/api/actresses/3/headshot
```

## Notes

- Headshot is processed on-demand and cached as `headshot.jpg`
- Name components are extracted from database fields: `firstname` and `familiq`
- If `firstName` or `lastName` are missing, they're derived from the full `name` field

