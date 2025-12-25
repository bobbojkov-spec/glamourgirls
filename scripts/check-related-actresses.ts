import { getPool } from '../src/lib/db';

async function checkRelatedActresses() {
  const pool = getPool();
  
  try {
    // Check total count
    const countResult = await pool.query('SELECT COUNT(*)::int as total FROM related_actresses');
    console.log('📊 Total related_actresses records:', countResult.rows[0].total);
    
    if (countResult.rows[0].total === 0) {
      console.log('❌ No relations found in database');
      return;
    }
    
    // Get sample records
    const sampleResult = await pool.query(`
      SELECT 
        ra.*,
        g1.nm as actress_name,
        g2.nm as related_name
      FROM related_actresses ra
      LEFT JOIN girls g1 ON ra.actress_id = g1.id
      LEFT JOIN girls g2 ON ra.related_id = g2.id
      ORDER BY ra.id DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Sample records (last 10):');
    sampleResult.rows.forEach((row: any, i: number) => {
      console.log(`\n${i + 1}. Actress: ${row.actress_name || `ID ${row.actress_id}`} → Related: ${row.related_name || `ID ${row.related_id}`}`);
      console.log(`   Score: ${row.score}`);
      console.log(`   Reasons: ${JSON.stringify(row.reasons, null, 2)}`);
    });
    
    // Get unique actress count
    const uniqueResult = await pool.query('SELECT COUNT(DISTINCT actress_id)::int as unique_actresses FROM related_actresses');
    console.log('\n👥 Unique actresses with relations:', uniqueResult.rows[0].unique_actresses);
    
    // Get average relations per actress
    const avgResult = await pool.query(`
      SELECT 
        AVG(relation_count)::numeric(10,2) as avg_relations
      FROM (
        SELECT actress_id, COUNT(*) as relation_count
        FROM related_actresses
        GROUP BY actress_id
      ) subq
    `);
    console.log('📈 Average relations per actress:', avgResult.rows[0].avg_relations);
    
    // Get top actresses by number of relations
    const topResult = await pool.query(`
      SELECT 
        ra.actress_id,
        g.nm as actress_name,
        COUNT(*)::int as relation_count
      FROM related_actresses ra
      LEFT JOIN girls g ON ra.actress_id = g.id
      GROUP BY ra.actress_id, g.nm
      ORDER BY relation_count DESC
      LIMIT 5
    `);
    
    console.log('\n🏆 Top 5 actresses by number of relations:');
    topResult.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. ${row.actress_name || `ID ${row.actress_id}`}: ${row.relation_count} relations`);
    });
    
  } catch (error: any) {
    console.error('❌ Error checking related_actresses:', error.message);
    console.error(error.stack);
  } finally {
    // Don't close the pool as it's shared
    process.exit(0);
  }
}

checkRelatedActresses();

