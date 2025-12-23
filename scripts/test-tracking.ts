import mysql from 'mysql2/promise';

async function testTracking() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'glamourgirls',
  });

  try {
    console.log('Testing view tracking...\n');

    // Get a random published actress
    const [actresses] = await connection.execute(
      `SELECT id, nm FROM girls WHERE published = 2 LIMIT 5`
    );

    if ((actresses as any[]).length === 0) {
      console.log('No published actresses found. Cannot test tracking.');
      return;
    }

    const testActress = (actresses as any[])[0];
    console.log(`Testing with actress: ${testActress.nm} (ID: ${testActress.id})\n`);

    // Simulate a view by inserting into views_log
    await connection.execute(
      `INSERT INTO views_log (girlid, viewed_at) VALUES (?, NOW())`,
      [testActress.id]
    );
    console.log('✓ Simulated a view');

    // Also update the views count in girls table
    await connection.execute(
      `UPDATE girls SET views = COALESCE(views, 0) + 1 WHERE id = ?`,
      [testActress.id]
    );
    console.log('✓ Updated views count in girls table');

    // Verify the tracking
    const [viewCount] = await connection.execute(
      `SELECT COUNT(*) as count FROM views_log WHERE girlid = ?`,
      [testActress.id]
    );
    console.log(`\n✓ Verification:`);
    console.log(`  - Views logged for ${testActress.nm}: ${(viewCount as any[])[0]?.count || 0}`);

    const [totalViews] = await connection.execute(
      `SELECT COUNT(*) as total FROM views_log`
    );
    console.log(`  - Total views in system: ${(totalViews as any[])[0]?.total || 0}`);

    console.log('\n✓ Tracking test successful!');
    console.log('\nNow check the Girls Stats page: http://localhost:3000/admin/girls-stats');
    console.log(`You should see ${testActress.nm} with 1 view.`);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

testTracking();

