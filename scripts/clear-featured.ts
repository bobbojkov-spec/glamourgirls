import dotenv from 'dotenv';
import path from 'path';
import pool from '../src/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function clearFeatured() {
  try {
    console.log('Starting...');
    console.log('Clearing all featured actresses...');
    
    const [result] = await pool.execute(
      `UPDATE girls SET is_featured = false, featured_order = NULL WHERE is_featured = true`
    ) as any[];
    
    console.log('Update executed');
    console.log('✅ Cleared all featured actresses');
    
    // Verify
    console.log('Verifying...');
    const [check] = await pool.execute(
      `SELECT COUNT(*) as count FROM girls WHERE is_featured = true`
    ) as any[];
    
    const count = Array.isArray(check) && check.length > 0 ? check[0]?.count : 0;
    console.log(`Remaining featured: ${count}`);
    console.log('Done!');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    try {
      await pool.end();
    } catch (e) {
      // Ignore
    }
    process.exit(1);
  }
}

console.log('Script starting...');
clearFeatured().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

