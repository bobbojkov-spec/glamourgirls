/**
 * Show all girls' SEO/meta data from the database
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

async function showAllGirlsSEO() {
  try {
    console.log('📊 Fetching ALL girls SEO/meta data...\n');

    const result = await pool.query(`
      SELECT 
        id,
        nm as name,
        seotitle,
        metadescription,
        metakeywords,
        h1title,
        introtext,
        ogtitle,
        ogdescription,
        ogimage,
        canonicalurl
      FROM girls
      ORDER BY id ASC
    `);

    console.log(`Total girls: ${result.rows.length}\n`);
    console.log('='.repeat(100));
    
    let hasData = 0;
    let missingData = 0;

    result.rows.forEach((girl: any, index: number) => {
      const hasSeoTitle = girl.seotitle && girl.seotitle.trim() !== '';
      const hasMetaDesc = girl.metadescription && girl.metadescription.trim() !== '';
      const hasH1 = girl.h1title && girl.h1title.trim() !== '';
      
      if (hasSeoTitle || hasMetaDesc || hasH1) {
        hasData++;
      } else {
        missingData++;
      }

      console.log(`\n${index + 1}. ID: ${girl.id} - ${girl.name}`);
      console.log('-'.repeat(100));
      
      if (hasSeoTitle) {
        console.log(`   SEO Title: ${girl.seotitle.substring(0, 80)}${girl.seotitle.length > 80 ? '...' : ''}`);
      } else {
        console.log(`   SEO Title: [EMPTY]`);
      }
      
      if (hasMetaDesc) {
        console.log(`   Meta Desc: ${girl.metadescription.substring(0, 80)}${girl.metadescription.length > 80 ? '...' : ''}`);
      } else {
        console.log(`   Meta Desc: [EMPTY]`);
      }
      
      if (girl.metakeywords && girl.metakeywords.trim() !== '') {
        console.log(`   Keywords: ${girl.metakeywords.substring(0, 60)}${girl.metakeywords.length > 60 ? '...' : ''}`);
      } else {
        console.log(`   Keywords: [EMPTY]`);
      }
      
      if (hasH1) {
        console.log(`   H1 Title: ${girl.h1title}`);
      } else {
        console.log(`   H1 Title: [EMPTY]`);
      }
      
      if (girl.introtext && girl.introtext.trim() !== '') {
        console.log(`   Intro Text: ${girl.introtext.substring(0, 60)}${girl.introtext.length > 60 ? '...' : ''}`);
      } else {
        console.log(`   Intro Text: [EMPTY]`);
      }
      
      if (girl.ogtitle && girl.ogtitle.trim() !== '') {
        console.log(`   OG Title: ${girl.ogtitle}`);
      } else {
        console.log(`   OG Title: [EMPTY]`);
      }
      
      if (girl.ogdescription && girl.ogdescription.trim() !== '') {
        console.log(`   OG Desc: ${girl.ogdescription.substring(0, 60)}${girl.ogdescription.length > 60 ? '...' : ''}`);
      } else {
        console.log(`   OG Desc: [EMPTY]`);
      }
      
      if (girl.ogimage && girl.ogimage.trim() !== '') {
        console.log(`   OG Image: ${girl.ogimage}`);
      } else {
        console.log(`   OG Image: [EMPTY]`);
      }
      
      if (girl.canonicalurl && girl.canonicalurl.trim() !== '') {
        console.log(`   Canonical: ${girl.canonicalurl}`);
      } else {
        console.log(`   Canonical: [EMPTY]`);
      }
    });

    console.log('\n' + '='.repeat(100));
    console.log(`\n📈 Summary:`);
    console.log(`   Total girls: ${result.rows.length}`);
    console.log(`   With SEO data: ${hasData}`);
    console.log(`   Missing SEO data: ${missingData}`);
    console.log(`   Percentage with data: ${((hasData / result.rows.length) * 100).toFixed(1)}%`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

showAllGirlsSEO();

