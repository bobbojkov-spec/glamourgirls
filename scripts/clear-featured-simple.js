const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

async function clear() {
  try {
    console.log('Clearing featured actresses...');
    const result = await pool.query(
      "UPDATE girls SET is_featured = false, featured_order = NULL WHERE is_featured = true"
    );
    console.log(`✅ Cleared ${result.rowCount} actresses`);
    
    const check = await pool.query("SELECT COUNT(*) as count FROM girls WHERE is_featured = true");
    console.log(`Remaining: ${check.rows[0].count}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

clear();

