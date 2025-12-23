/**
 * Script to populate existing actresses with auto-generated SEO data
 * Run: npx tsx scripts/populate-seo-data.ts
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { generateSEO } from '../src/lib/seo/generate-seo';

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

async function populateSEO() {
  try {
    console.log('Fetching all actresses...');
    
    // Fetch all actresses
    const [actresses] = await pool.execute(
      `SELECT id, nm, firstname, familiq, middlenames, godini, theirman, slug 
       FROM girls 
       ORDER BY id ASC`
    ) as any[];

    console.log(`Found ${actresses.length} actresses to process`);

    let updated = 0;
    let skipped = 0;

    for (const actress of actresses) {
      try {
        // Check if SEO data already exists
        const [existing] = await pool.execute(
          `SELECT seo_title FROM girls WHERE id = ? AND seo_title IS NOT NULL AND seo_title != ''`,
          [actress.id]
        ) as any[];

        // Skip if SEO data already exists (comment out this check to regenerate all)
        if (existing.length > 0) {
          console.log(`Skipping ${actress.nm} (ID: ${actress.id}) - SEO data already exists`);
          skipped++;
          continue;
        }

        // Generate slug if missing
        let slug = actress.slug;
        if (!slug || slug.trim() === '') {
          slug = `${actress.firstname || ''}-${actress.familiq || ''}`.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
          
          // Update slug in database
          await pool.execute(
            `UPDATE girls SET slug = ? WHERE id = ?`,
            [slug, actress.id]
          );
        }

        // Determine era
        const era = actress.theirman === 1 ? '3' : (actress.godini?.toString() || '3');
        const eraMap: Record<string, string> = {
          '1': '20-30s',
          '2': '40s',
          '3': '50s',
          '4': '60s',
        };
        const eraText = eraMap[era] || '50s';

        // Generate SEO data
        const seoData = generateSEO({
          name: actress.nm || '',
          firstName: actress.firstname || '',
          lastName: actress.familiq || '',
          era: eraText,
          slug: slug,
          id: actress.id,
        }, baseUrl);

        // Update database
        await pool.execute(
          `UPDATE girls SET
            seo_title = ?,
            meta_description = ?,
            meta_keywords = ?,
            og_title = ?,
            og_description = ?,
            og_image = ?,
            canonical_url = ?,
            h1_title = ?,
            intro_text = ?,
            slug = ?
           WHERE id = ?`,
          [
            seoData.seoTitle,
            seoData.metaDescription,
            seoData.metaKeywords,
            seoData.ogTitle,
            seoData.ogDescription,
            seoData.ogImage,
            seoData.canonicalUrl,
            seoData.h1Title,
            seoData.introText,
            slug,
            actress.id,
          ]
        );

        updated++;
        console.log(`✓ Updated SEO for ${actress.nm} (ID: ${actress.id})`);
      } catch (error) {
        console.error(`Error processing ${actress.nm} (ID: ${actress.id}):`, error);
      }
    }

    console.log(`\n✅ Completed!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${actresses.length}`);
  } catch (error) {
    console.error('Error populating SEO data:', error);
  } finally {
    await pool.end();
  }
}

populateSEO();

