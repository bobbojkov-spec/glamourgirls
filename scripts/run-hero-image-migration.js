const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    console.log('📄 Reading migration SQL...');
    const sqlPath = path.join(__dirname, 'add-hero-image-setting.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Running migration...');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Created site_settings table');
    console.log('   - Added hero_image_path setting');
    console.log('   - Created index for faster lookups');
    
    // Verify the table was created
    const result = await pool.query(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key = 'hero_image_path'"
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: hero_image_path setting exists');
      console.log(`   Current value: ${result.rows[0].setting_value || 'NULL (no hero image selected)'}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('   Note: Table already exists, this is OK');
    } else {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();

