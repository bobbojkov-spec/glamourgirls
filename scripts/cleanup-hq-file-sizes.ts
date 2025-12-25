/**
 * Cleanup script to remove file size data (sz and description) from HQ images
 * Use this if the calculate-hq-file-sizes.ts script was interrupted
 * 
 * This script removes:
 * - sz (file size in bytes) values that were added during the interrupted run
 * - description values that were added during the interrupted run
 * 
 * Usage: tsx scripts/cleanup-hq-file-sizes.ts
 * 
 * WARNING: This will remove sz and description for ALL HQ images > 1200px
 * Only run this if you want to start fresh after an interruption
 */

import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function cleanupFileSizes() {
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    console.log('🧹 Cleaning up file size data for HQ images...\n');
    
    // Count how many will be affected
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM images
      WHERE mytp = 5
        AND (width > 1200 OR height > 1200)
        AND (sz IS NOT NULL OR description IS NOT NULL)
    `);

    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log('✅ No records to clean up. All HQ images already have sz/description cleared.');
      return;
    }

    console.log(`⚠️  This will remove sz and description from ${count} HQ images.`);
    console.log('⚠️  This action cannot be undone!\n');
    
    // In a real scenario, you might want to add a confirmation prompt
    // For now, we'll proceed with the cleanup
    
    // Remove sz and description for HQ images > 1200px
    const result = await client.query(`
      UPDATE images
      SET sz = NULL, description = NULL
      WHERE mytp = 5
        AND (width > 1200 OR height > 1200)
        AND (sz IS NOT NULL OR description IS NOT NULL)
    `);

    console.log(`✅ Cleaned up ${result.rowCount} records`);
    console.log('   - Removed sz (file size in bytes)');
    console.log('   - Removed description (formatted dimensions and file size)');
    console.log('\n✅ Cleanup complete! You can now re-run calculate-hq-file-sizes.ts');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

cleanupFileSizes().catch(console.error);

