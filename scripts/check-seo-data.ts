/**
 * Check SEO column names and data in the girls table
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL || process.env.TARGET_DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
});

async function checkSEOData() {
  try {
    console.log('🔍 Checking SEO columns and data in girls table...\n');

    // Check what SEO-related columns exist
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'girls'
      AND (
        column_name LIKE '%seo%' OR 
        column_name LIKE '%meta%' OR 
        column_name LIKE '%og%' OR 
        column_name LIKE '%h1%' OR 
        column_name LIKE '%intro%' OR 
        column_name LIKE '%canonical%'
      )
      ORDER BY column_name
    `);

    console.log('📊 Existing SEO-related columns:');
    columnsResult.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check if there's any SEO data in the database
    console.log('\n📈 Checking for SEO data...');
    
    // Try both naming conventions
    const possibleColumns = [
      'seo_title', 'seotitle', 'seoTitle',
      'meta_description', 'metadescription', 'metaDescription',
      'h1_title', 'h1title', 'h1Title',
      'intro_text', 'introtext', 'introText',
    ];

    const existingColumns = columnsResult.rows.map((r: any) => r.column_name.toLowerCase());
    
    console.log('\n🔎 Checking for data in existing columns:');
    for (const col of possibleColumns) {
      if (existingColumns.includes(col.toLowerCase())) {
        const countResult = await pool.query(`
          SELECT COUNT(*) as total,
                 COUNT(CASE WHEN "${col}" IS NOT NULL AND "${col}" != '' THEN 1 END) as has_data
          FROM girls
        `);
        const { total, has_data } = countResult.rows[0];
        console.log(`  ${col}: ${has_data}/${total} rows have data`);
        
        // Show a sample
        if (parseInt(has_data) > 0) {
          const sampleResult = await pool.query(`
            SELECT id, nm, "${col}" as value
            FROM girls
            WHERE "${col}" IS NOT NULL AND "${col}" != ''
            LIMIT 3
          `);
          console.log(`    Sample data:`);
          sampleResult.rows.forEach((row: any) => {
            console.log(`      ID ${row.id} (${row.nm}): ${String(row.value).substring(0, 50)}...`);
          });
        }
      }
    }

    // Check a specific girl to see what columns have data
    console.log('\n👤 Checking a specific girl (ID 921 - Anna Navarro):');
    const girlResult = await pool.query(`
      SELECT * FROM girls WHERE id = 921
    `);
    
    if (girlResult.rows.length > 0) {
      const girl = girlResult.rows[0];
      console.log('  Columns with data:');
      Object.keys(girl).forEach(key => {
        if ((key.includes('seo') || key.includes('meta') || key.includes('og') || 
             key.includes('h1') || key.includes('intro') || key.includes('canonical')) &&
            girl[key] !== null && girl[key] !== '') {
          console.log(`    ${key}: ${String(girl[key]).substring(0, 50)}...`);
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkSEOData();

