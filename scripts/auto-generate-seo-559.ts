/**
 * Script to auto-generate SEO data for actress ID 559
 * Run: npx tsx scripts/auto-generate-seo-559.ts
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
const actressId = 559;

async function autoGenerateSEO() {
  try {
    console.log(`Fetching data for actress ID ${actressId}...`);
    
    // Fetch actress data
    const [actressRows] = await pool.execute(
      `SELECT id, nm, firstname, familiq, middlenames, godini, theirman, slug
       FROM girls WHERE id = ?`,
      [actressId]
    ) as any[];

    if (!actressRows || actressRows.length === 0) {
      console.error('Actress not found');
      return;
    }

    const row = actressRows[0];
    console.log(`Found: ${row.nm}`);

    // Fetch timeline events
    const [timelineRows] = await pool.execute(
      `SELECT shrttext as date, lngtext as event 
       FROM girlinfos 
       WHERE girlid = ? 
       ORDER BY ord ASC`,
      [actressId]
    ) as any[];
    console.log(`Timeline events: ${timelineRows.length}`);

    // Count gallery images
    const [galleryCountRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM images WHERE girlid = ? AND mytp = 4`,
      [actressId]
    ) as any[];
    const galleryCount = galleryCountRows[0]?.count || 0;
    console.log(`Gallery images: ${galleryCount}`);

    // Get headshot URL
    const headshotUrl = `/api/actresses/${actressId}/headshot`;

    // Get first gallery image
    const [firstGalleryRows] = await pool.execute(
      `SELECT path FROM images WHERE girlid = ? AND mytp = 4 ORDER BY id ASC LIMIT 1`,
      [actressId]
    ) as any[];
    const firstGalleryImageUrl = firstGalleryRows[0]?.path || null;

    // Determine era
    const era = row.theirman === 1 ? '3' : (row.godini?.toString() || '3');

    // Generate slug if missing
    let slug = row.slug;
    if (!slug || slug.trim() === '') {
      slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      console.log(`Generated slug: ${slug}`);
    }

    // Prepare data for SEO generation
    const actressDataForSEO = {
      id: actressId,
      name: row.nm || '',
      firstName: row.firstname || '',
      lastName: row.familiq || '',
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

    console.log('\nGenerating SEO data...');
    // Generate SEO data
    const seoData = generateSEOEnhanced(actressDataForSEO, baseUrl);

    console.log('\nGenerated SEO Data:');
    console.log('Title:', seoData.seoTitle);
    console.log('Description:', seoData.seoDescription);
    console.log('H1:', seoData.h1Title);
    console.log('Status:', seoData.seoStatus);
    console.log('Intro words:', seoData.introText.split(/\s+/).length);

    // Save to database (using camelCase column names)
    console.log('\nSaving to database...');
    await pool.execute(
      `UPDATE girls SET
        seoTitle = ?,
        metaDescription = ?,
        metaKeywords = ?,
        h1Title = ?,
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
        seoData.ogTitle,
        seoData.ogDescription,
        seoData.ogImageUrl,
        seoData.canonicalUrl,
        slug,
        actressId,
      ]
    );

    console.log('\n✅ SEO data saved successfully!');
    console.log(`\nStatus: ${seoData.seoStatus.toUpperCase()}`);
    console.log(`\nView in admin: http://localhost:3000/admin/girls/${actressId}`);
  } catch (error) {
    console.error('Error auto-generating SEO data:', error);
  } finally {
    await pool.end();
  }
}

autoGenerateSEO();

