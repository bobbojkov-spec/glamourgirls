import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

async function checkAndSetupTracking() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'glamourgirls',
  });

  try {
    console.log('Checking database setup...');

    // First, check what tables exist
    const [allTables] = await connection.execute(
      `SHOW TABLES`
    );
    console.log('Existing tables:', (allTables as any[]).map((t: any) => Object.values(t)[0]).join(', '));

    // Check if views column exists in girls table
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'girls' AND COLUMN_NAME = 'views'`
    );

    if ((columns as any[]).length === 0) {
      console.log('Adding views column to girls table...');
      await connection.execute(
        `ALTER TABLE girls ADD COLUMN views INT DEFAULT 0`
      );
      console.log('✓ Added views column');
    } else {
      console.log('✓ views column already exists');
    }

    // Check if views_log table exists
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'views_log'`
    );

    if ((tables as any[]).length === 0) {
      console.log('Creating views_log table...');
      // Try with foreign key first
      try {
        await connection.execute(`
          CREATE TABLE views_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            girlid INT NOT NULL,
            viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_girlid (girlid),
            INDEX idx_viewed_at (viewed_at),
            FOREIGN KEY (girlid) REFERENCES girls(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ Created views_log table with foreign key');
      } catch (fkError: any) {
        // If foreign key fails, create without it
        console.log('Creating views_log table without foreign key...');
        await connection.execute(`
          CREATE TABLE views_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            girlid INT NOT NULL,
            viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_girlid (girlid),
            INDEX idx_viewed_at (viewed_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ Created views_log table (without foreign key)');
      }
    } else {
      console.log('✓ views_log table already exists');
    }

    // Check current view counts
    const [viewCounts] = await connection.execute(
      `SELECT COUNT(*) as total_views FROM views_log`
    );
    console.log(`\nCurrent tracking status:`);
    console.log(`- Total views logged: ${(viewCounts as any[])[0]?.total_views || 0}`);

    const [girlsWithViews] = await connection.execute(
      `SELECT COUNT(*) as count FROM girls WHERE COALESCE(views, 0) > 0`
    );
    console.log(`- Girls with view counts: ${(girlsWithViews as any[])[0]?.count || 0}`);

    // Show top 5 most viewed
    const [topViewed] = await connection.execute(
      `SELECT g.id, g.nm, COUNT(vl.id) as view_count
       FROM girls g
       LEFT JOIN views_log vl ON g.id = vl.girlid
       GROUP BY g.id, g.nm
       HAVING view_count > 0
       ORDER BY view_count DESC
       LIMIT 5`
    );
    
    if ((topViewed as any[]).length > 0) {
      console.log('\nTop 5 most viewed:');
      (topViewed as any[]).forEach((row: any, i: number) => {
        console.log(`  ${i + 1}. ${row.nm} - ${row.view_count} views`);
      });
    } else {
      console.log('\nNo views tracked yet.');
    }

    console.log('\n✓ Database setup complete!');
    console.log('\nTo test tracking:');
    console.log('1. Visit an actress page: http://localhost:3000/actress/[id]/[slug]');
    console.log('2. Check the Girls Stats page: http://localhost:3000/admin/girls-stats');

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await connection.end();
  }
}

checkAndSetupTracking();
