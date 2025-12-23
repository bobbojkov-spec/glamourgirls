/**
 * Check which SEO columns exist in the girls table
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'glamourgirls',
  waitForConnections: true,
  connectionLimit: 10,
});

async function checkColumns() {
  try {
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'girls'
       AND COLUMN_NAME LIKE '%seo%' OR COLUMN_NAME LIKE '%meta%' OR COLUMN_NAME LIKE '%og%' OR COLUMN_NAME LIKE '%h1%' OR COLUMN_NAME LIKE '%intro%' OR COLUMN_NAME LIKE '%canonical%'
       ORDER BY COLUMN_NAME`
    ) as any[];

    console.log('Existing SEO-related columns:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Check for specific columns we need
    const neededColumns = [
      'seo_title', 'meta_description', 'meta_keywords', 'h1_title', 'intro_text',
      'og_title', 'og_description', 'og_image', 'canonical_url',
      'seo_status', 'auto_generated', 'last_auto_generate'
    ];

    const existingColumnNames = columns.map((c: any) => c.COLUMN_NAME);
    console.log('\nMissing columns:');
    neededColumns.forEach(col => {
      if (!existingColumnNames.includes(col)) {
        console.log(`  ✗ ${col}`);
      } else {
        console.log(`  ✓ ${col}`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();

