/**
 * Script to auto-generate SEO data for ALL actresses
 * Run: npx tsx scripts/auto-generate-seo-all.ts
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { generateSEOEnhanced } from '../src/lib/seo/generate-seo-enhanced';

dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'glamourgirls',
  waitForConnections: true,
  connectionLimit: 10,
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';

async function autoGenerateSEOForAll() {
  try {
    console.log('Fetching all actresses...');
    
    // Fetch all actresses
    const [actresses] = await pool.execute(
      `SELECT id, nm, firstname, familiq, middlenames, godini, theirman, slug
       FROM girls 
       WHERE published = 2
       ORDER BY id ASC`
    ) as any[];

    console.log(`Found ${actresses.length} actresses to process\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const statusCounts = { red: 0, yellow: 0, green: 0 };

    for (let i = 0; i < actresses.length; i++) {
      const actress = actresses[i];
      const progress = `[${i + 1}/${actresses.length}]`;
      
      try {
        // Check if SEO data already exists (optional - comment out to regenerate all)
        const [existing] = await pool.execute(
          `SELECT seoTitle FROM girls WHERE id = ? AND seoTitle IS NOT NULL AND seoTitle != ''`,
          [actress.id]
        ) as any[];

        // Skip if SEO data already exists (uncomment to regenerate all)
        // if (existing.length > 0) {
        //   console.log(`${progress} Skipping ${actress.nm} (ID: ${actress.id}) - SEO data already exists`);
        //   skipped++;
        //   continue;
        // }

        // Fetch timeline events
        const [timelineRows] = await pool.execute(
          `SELECT shrttext as date, lngtext as event 
           FROM girlinfos 
           WHERE girlid = ? 
           ORDER BY ord ASC`,
          [actress.id]
        ) as any[];

        // Count gallery images
        const [galleryCountRows] = await pool.execute(
          `SELECT COUNT(*) as count FROM images WHERE girlid = ? AND mytp = 4`,
          [actress.id]
        ) as any[];
        const galleryCount = galleryCountRows[0]?.count || 0;

        // Get headshot URL
        const headshotUrl = `/api/actresses/${actress.id}/headshot`;

        // Get first gallery image
        const [firstGalleryRows] = await pool.execute(
          `SELECT path FROM images WHERE girlid = ? AND mytp = 4 ORDER BY id ASC LIMIT 1`,
          [actress.id]
        ) as any[];
        const firstGalleryImageUrl = firstGalleryRows[0]?.path || null;

        // Determine era
        const era = actress.theirman === 1 ? '3' : (actress.godini?.toString() || '3');

        // Generate slug if missing
        let slug = actress.slug;
        if (!slug || slug.trim() === '') {
          slug = `${actress.firstname || ''}-${actress.familiq || ''}`.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        }

        // Prepare data for SEO generation
        const actressDataForSEO = {
          id: actress.id,
          name: actress.nm || '',
          firstName: actress.firstname || '',
          lastName: actress.familiq || '',
          era,
          slug,
          galleryCount,
          timelineEvents: timelineRows.map((t: any) => ({
            date: t.date,
            event: t.event,
          })),
          headshotUrl,
          firstGalleryImageUrl,
        };

        // Generate SEO data
        const seoData = generateSEOEnhanced(actressDataForSEO, baseUrl);

        // Save to database (using camelCase column names)
        // Always include introText - it should exist now
        await pool.execute(
          `UPDATE girls SET
            seoTitle = ?,
            metaDescription = ?,
            metaKeywords = ?,
            h1Title = ?,
            introText = ?,
            ogTitle = ?,
            ogDescription = ?,
            ogImage = ?,
            canonicalUrl = ?,
            slug = ?
           WHERE id = ?`,
          [
            seoData.seoTitle,
            seoData.seoDescription,
            seoData.seoKeywords,
            seoData.h1Title,
            seoData.introText || null,
            seoData.ogTitle,
            seoData.ogDescription,
            seoData.ogImageUrl,
            seoData.canonicalUrl,
            slug,
            actress.id,
          ]
        );

        statusCounts[seoData.seoStatus]++;
        updated++;
        
        // Show progress every 10 entries or for important updates
        if ((i + 1) % 10 === 0 || seoData.seoStatus === 'green') {
          console.log(`${progress} ✓ ${actress.nm} (ID: ${actress.id}) - Status: ${seoData.seoStatus.toUpperCase()}`);
        }
      } catch (error) {
        errors++;
        console.error(`${progress} ✗ Error processing ${actress.nm} (ID: ${actress.id}):`, error);
      }
    }

    console.log(`\n✅ Completed!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${actresses.length}`);
    console.log(`\nStatus Breakdown:`);
    console.log(`   Green: ${statusCounts.green}`);
    console.log(`   Yellow: ${statusCounts.yellow}`);
    console.log(`   Red: ${statusCounts.red}`);
  } catch (error) {
    console.error('Error auto-generating SEO data:', error);
  } finally {
    await pool.end();
  }
}

autoGenerateSEOForAll();

