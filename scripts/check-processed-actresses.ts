import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Check actresses 1, 3, and 729 which we processed
    const result = await client.query(
      `SELECT id, nm as name, firstname, familiq FROM girls WHERE id IN (1, 3, 729) ORDER BY id`
    );
    
    console.log('Actresses processed and images uploaded:');
    console.log('==========================================');
    result.rows.forEach(row => {
      const fullName = row.name || (row.firstname && row.familiq ? `${row.firstname} ${row.familiq}` : row.firstname || row.familiq || 'Unknown');
      console.log(`ID ${row.id}: ${fullName}`);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);




