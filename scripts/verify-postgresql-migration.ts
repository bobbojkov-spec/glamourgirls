/**
 * Verify PostgreSQL Connection and Data Migration Status
 * 
 * This script checks:
 * 1. PostgreSQL connection is working
 * 2. All required tables exist
 * 3. Data exists in PostgreSQL (record counts)
 * 4. Sample data verification
 */

import pool from '../src/lib/db';

async function verifyPostgreSQL() {
  console.log('🔍 Verifying PostgreSQL Connection and Migration Status...\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Test basic connection
    console.log('\n📡 Step 1: Testing PostgreSQL Connection');
    console.log('-'.repeat(60));
    try {
      const [result] = await pool.execute('SELECT version() as version') as any[];
      if (Array.isArray(result) && result.length > 0) {
        console.log('✅ PostgreSQL Connection: SUCCESS');
        console.log(`   Version: ${result[0].version}`);
      } else {
        console.log('⚠️  Connection test returned unexpected result');
      }
    } catch (error: any) {
      console.error('❌ PostgreSQL Connection: FAILED');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }

    // Step 2: Check database configuration
    console.log('\n⚙️  Step 2: Database Configuration');
    console.log('-'.repeat(60));
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'glamourgirls'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);

    // Step 3: Check required tables exist
    console.log('\n📊 Step 3: Checking Required Tables');
    console.log('-'.repeat(60));
    const requiredTables = ['girls', 'images', 'girlinfos', 'girllinks'];
    const existingTables: string[] = [];
    const missingTables: string[] = [];

    for (const table of requiredTables) {
      try {
        const [result] = await pool.execute(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists`,
          [table]
        ) as any[];
        
        if (Array.isArray(result) && result[0]?.exists) {
          existingTables.push(table);
          console.log(`   ✅ ${table}: EXISTS`);
        } else {
          missingTables.push(table);
          console.log(`   ❌ ${table}: MISSING`);
        }
      } catch (error: any) {
        console.error(`   ❌ ${table}: ERROR - ${error.message}`);
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      console.log(`\n⚠️  WARNING: ${missingTables.length} table(s) are missing!`);
    }

    // Step 4: Check data counts
    console.log('\n📈 Step 4: Data Counts');
    console.log('-'.repeat(60));
    
    const tableCounts: Record<string, number> = {};

    // Count girls
    try {
      const [result] = await pool.execute('SELECT COUNT(*)::int as total FROM girls') as any[];
      const total = result?.[0]?.total || 0;
      tableCounts.girls = total;
      console.log(`   girls: ${total.toLocaleString()} records`);
    } catch (error: any) {
      console.error(`   girls: ERROR - ${error.message}`);
    }

    // Count published girls
    try {
      const [result] = await pool.execute(
        'SELECT COUNT(*)::int as total FROM girls WHERE published = 2'
      ) as any[];
      const published = result?.[0]?.total || 0;
      console.log(`   girls (published): ${published.toLocaleString()} records`);
    } catch (error: any) {
      console.error(`   girls (published): ERROR - ${error.message}`);
    }

    // Count images
    try {
      const [result] = await pool.execute('SELECT COUNT(*)::int as total FROM images') as any[];
      const total = result?.[0]?.total || 0;
      tableCounts.images = total;
      console.log(`   images: ${total.toLocaleString()} records`);
    } catch (error: any) {
      console.error(`   images: ERROR - ${error.message}`);
    }

    // Count gallery images (mytp = 4)
    try {
      const [result] = await pool.execute(
        'SELECT COUNT(*)::int as total FROM images WHERE mytp = 4'
      ) as any[];
      const gallery = result?.[0]?.total || 0;
      console.log(`   images (gallery, mytp=4): ${gallery.toLocaleString()} records`);
    } catch (error: any) {
      console.error(`   images (gallery): ERROR - ${error.message}`);
    }

    // Count girlinfos
    try {
      const [result] = await pool.execute('SELECT COUNT(*)::int as total FROM girlinfos') as any[];
      const total = result?.[0]?.total || 0;
      tableCounts.girlinfos = total;
      console.log(`   girlinfos: ${total.toLocaleString()} records`);
    } catch (error: any) {
      console.error(`   girlinfos: ERROR - ${error.message}`);
    }

    // Count girllinks
    try {
      const [result] = await pool.execute('SELECT COUNT(*)::int as total FROM girllinks') as any[];
      const total = result?.[0]?.total || 0;
      tableCounts.girllinks = total;
      console.log(`   girllinks: ${total.toLocaleString()} records`);
    } catch (error: any) {
      console.error(`   girllinks: ERROR - ${error.message}`);
    }

    // Step 5: Sample data verification
    console.log('\n🔬 Step 5: Sample Data Verification');
    console.log('-'.repeat(60));
    try {
      const [samples] = await pool.execute(
        `SELECT id, nm, firstname, familiq, published, slug, godini 
         FROM girls 
         WHERE published = 2 
         ORDER BY id 
         LIMIT 5`
      ) as any[];

      if (Array.isArray(samples) && samples.length > 0) {
        console.log(`   ✅ Found ${samples.length} sample record(s):`);
        samples.forEach((row: any, index: number) => {
          console.log(`      ${index + 1}. ID: ${row.id}, Name: ${row.nm || 'N/A'}, Slug: ${row.slug || 'N/A'}`);
        });
      } else {
        console.log('   ⚠️  No published girls found in database');
      }
    } catch (error: any) {
      console.error(`   ❌ Sample data check failed: ${error.message}`);
    }

    // Step 6: Check for related_actresses table (optional)
    console.log('\n🔗 Step 6: Optional Tables');
    console.log('-'.repeat(60));
    try {
      const [result] = await pool.execute(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'related_actresses'
        ) as exists`
      ) as any[];
      
      if (Array.isArray(result) && result[0]?.exists) {
        const [count] = await pool.execute(
          'SELECT COUNT(*)::int as total FROM related_actresses'
        ) as any[];
        const total = count?.[0]?.total || 0;
        console.log(`   ✅ related_actresses: EXISTS (${total.toLocaleString()} records)`);
      } else {
        console.log('   ⚠️  related_actresses: NOT FOUND (optional table)');
      }
    } catch (error: any) {
      console.log(`   ⚠️  related_actresses: ${error.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist');
    } else {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
    }

    const hasData = Object.values(tableCounts).some(count => count > 0);
    if (hasData) {
      console.log('✅ Database contains data');
      console.log(`   Total records across main tables: ${Object.values(tableCounts).reduce((a, b) => a + b, 0).toLocaleString()}`);
    } else {
      console.log('⚠️  Database appears to be empty or inaccessible');
    }

    console.log('\n✅ PostgreSQL Migration Verification Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Verification failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close pool
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run verification
verifyPostgreSQL().catch(console.error);

