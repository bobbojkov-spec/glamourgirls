# Related Actresses Discovery Script

This script automatically finds related actresses based on multiple criteria and stores them in a database table.

## Features

The script finds relationships based on:

1. **Same Era** - Actresses from the same time period (already implemented)
2. **Same Birth Year** - Actresses born in the same year (±2 years)
3. **Same Movies** - Actresses who appeared in the same films
4. **Same Partners** - Actresses who had relationships with the same men (for actresses with `theirman = 1`)
5. **Multiple Connections** - Actresses with multiple connections get higher scores

## How It Works

1. **Creates a table** `related_actresses` to store relationships
2. **Processes each actress** by:
   - Extracting birth year from timeline/biography
   - Extracting movie titles from timeline events
   - Extracting partner names from timeline (for actresses with theirman flag)
3. **Finds matches** by searching other actresses' timelines for:
   - Same birth years
   - Same movie mentions
   - Same partner mentions
4. **Scores relationships** - Higher scores for multiple connections
5. **Stores results** in the `related_actresses` table

## Running the Script

### Prerequisites

Make sure you have:
- Node.js installed
- Database credentials in `.env.local`
- TypeScript support (`tsx` or `ts-node`)

### Run the script:

```bash
# Using tsx (recommended)
npx tsx scripts/find-related-actresses.ts

# Or using ts-node
npx ts-node scripts/find-related-actresses.ts
```

### What to Expect

The script will:
- Show progress for each actress processed
- Display found movies, partners, and birth year
- Show how many related actresses were found
- Save all relationships to the database

Example output:
```
🚀 Starting related actresses discovery...

✅ Related actresses table ready
📊 Found 500 published actresses

[1/500] Processing: Jane Doe (ID: 123)
  📅 Birth year: 1945
  🎬 Movies found: 3
  💑 Partners found: 2
  ✅ Found 8 related actresses
  💾 Saved 8 relations
```

## Database Schema

The script creates a `related_actresses` table with:

- `id` - Primary key
- `actress_id` - ID of the main actress
- `related_id` - ID of the related actress
- `reason` - Text explaining why they're related (e.g., "Same movie: Casablanca")
- `score` - Relationship strength (higher = more connections)
- `created_at` / `updated_at` - Timestamps

## API Integration

The API route (`/api/actresses/[id]`) has been updated to:
1. First try to fetch from `related_actresses` table
2. Fall back to same-era matching if no relations found

This means the script can run in the background and gradually improve related actress suggestions.

## Re-running the Script

You can safely re-run the script at any time. It will:
- Clear existing relations for each actress
- Recalculate based on current data
- Update the relationships

This is useful if you:
- Add new actresses
- Update timeline/biography data
- Want to refresh relationships

## Tips

- Run the script periodically (e.g., weekly) to keep relationships up-to-date
- The script processes all published actresses, so it may take a while for large databases
- Check the console output to see which actresses have the most connections

## Troubleshooting

**No related actresses found?**
- Make sure actresses have timeline data
- Check that movie/partner names are mentioned in timeline events
- Birth years need to be extractable from timeline

**Script is slow?**
- This is normal for large databases
- The script processes one actress at a time to avoid overwhelming the database
- Consider running during off-peak hours

**Table doesn't exist error?**
- The script creates the table automatically
- Make sure you have CREATE TABLE permissions
- Check database connection settings in `.env.local`

