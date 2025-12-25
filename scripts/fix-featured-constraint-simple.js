const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

async function fixConstraint() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Step 1: Dropping old constraint...');
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'check_featured_order_range'
        ) THEN
          ALTER TABLE girls DROP CONSTRAINT check_featured_order_range;
        END IF;
      END $$;
    `);
    console.log('✅ Dropped old constraint');
    
    console.log('Step 2: Adding new conditional constraint...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'check_featured_order_when_featured'
        ) THEN
          ALTER TABLE girls 
          ADD CONSTRAINT check_featured_order_when_featured
          CHECK (
            (is_featured = false AND featured_order IS NULL)
            OR
            (is_featured = true AND featured_order BETWEEN 1 AND 8)
          );
        END IF;
      END $$;
    `);
    console.log('✅ Added new constraint');
    
    console.log('Step 3: Dropping old unique index...');
    await client.query('DROP INDEX IF EXISTS idx_girls_featured_order_unique;');
    console.log('✅ Dropped old index');
    
    console.log('Step 4: Creating new unique index...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_featured_order
      ON girls (featured_order)
      WHERE is_featured = true;
    `);
    console.log('✅ Created new unique index');
    
    await client.query('COMMIT');
    console.log('✅ All changes committed successfully!');
    
    // Verify
    const constraintCheck = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'check_featured_order_when_featured'
    `);
    console.log('\nConstraint:', constraintCheck.rows[0]?.definition);
    
    const indexCheck = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE indexname = 'unique_featured_order'
    `);
    console.log('Index:', indexCheck.rows[0]?.indexdef);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraint().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});

