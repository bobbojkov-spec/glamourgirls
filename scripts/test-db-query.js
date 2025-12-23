const mysql = require('mysql2/promise');

async function testDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'glamourgirls',
  });

  try {
    console.log('🔍 Testing Database Connection...\n');
    console.log('Database Config:');
    console.log('  Host:', process.env.DB_HOST || 'localhost');
    console.log('  User:', process.env.DB_USER || 'root');
    console.log('  Database:', process.env.DB_NAME || 'glamourgirls');
    console.log('  Password:', process.env.DB_PASSWORD ? '***' : '(empty)\n');

    // Step 1: Show table structure
    console.log('📊 STEP 1: Table Structure');
    console.log('='.repeat(50));
    const [columns] = await pool.execute(`SHOW COLUMNS FROM girls`);
    console.log('Columns in "girls" table:');
    columns.forEach((col) => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Step 2: Count all records
    console.log('📊 STEP 2: Record Counts');
    console.log('='.repeat(50));
    const [countAll] = await pool.execute(`SELECT COUNT(*) as total FROM girls`);
    console.log(`Total records: ${countAll[0].total}`);

    const [countPublished] = await pool.execute(`SELECT COUNT(*) as total FROM girls WHERE published = 2`);
    console.log(`Published records (published = 2): ${countPublished[0].total}`);
    console.log('');

    // Step 3: Get sample records
    console.log('📊 STEP 3: Sample Records (First 10)');
    console.log('='.repeat(50));
    const [samples] = await pool.execute(
      `SELECT id, nm, firstname, familiq, published, slug 
       FROM girls 
       LIMIT 10`
    );
    
    if (samples.length === 0) {
      console.log('⚠️  NO RECORDS FOUND IN DATABASE!');
    } else {
      samples.forEach((row, index) => {
        console.log(`\n[${index + 1}] ID: ${row.id}`);
        console.log(`    nm: "${row.nm || 'NULL'}"`);
        console.log(`    firstname: "${row.firstname || 'NULL'}"`);
        console.log(`    familiq: "${row.familiq || 'NULL'}"`);
        console.log(`    published: ${row.published}`);
        console.log(`    slug: "${row.slug || 'NULL'}"`);
      });
    }
    console.log('');

    // Step 4: Test search query
    console.log('📊 STEP 4: Testing Search Query');
    console.log('='.repeat(50));
    const keyword = 'adam';
    console.log(`Searching for keyword: "${keyword}"\n`);

    const searchQuery = `
      SELECT g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix, g.slug,
             COUNT(DISTINCT CASE WHEN i.mytp = 4 THEN i.id END) as photoCount,
             COUNT(DISTINCT CASE WHEN i.mytp = 5 THEN i.id END) as hqPhotoCount
      FROM girls g
      LEFT JOIN images i ON g.id = i.girlid
      WHERE g.published = 2
        AND (
          (g.nm IS NOT NULL AND LOWER(g.nm) LIKE LOWER(?)) OR 
          (g.firstname IS NOT NULL AND LOWER(g.firstname) LIKE LOWER(?)) OR 
          (g.familiq IS NOT NULL AND LOWER(g.familiq) LIKE LOWER(?))
        )
      GROUP BY g.id 
      ORDER BY g.familiq, g.firstname
    `;

    const keywordParam = `%${keyword}%`;
    console.log('Query:', searchQuery);
    console.log('Params:', [keywordParam, keywordParam, keywordParam]);
    console.log('');

    const [searchResults] = await pool.execute(searchQuery, [keywordParam, keywordParam, keywordParam]);
    console.log(`Search results: ${searchResults.length} records found\n`);

    if (searchResults.length > 0) {
      searchResults.forEach((row, index) => {
        console.log(`[${index + 1}] ID: ${row.id}, Name: "${row.nm}", First: "${row.firstname}", Last: "${row.familiq}"`);
      });
    } else {
      console.log('⚠️  NO RESULTS FOUND!');
      console.log('\nTrying alternative search (without NULL checks)...');
      const altQuery = `
        SELECT g.id, g.nm, g.firstname, g.familiq
        FROM girls g
        WHERE g.published = 2
          AND (
            LOWER(g.nm) LIKE LOWER(?) OR 
            LOWER(g.firstname) LIKE LOWER(?) OR 
            LOWER(g.familiq) LIKE LOWER(?)
          )
        LIMIT 10
      `;
      const [altResults] = await pool.execute(altQuery, [keywordParam, keywordParam, keywordParam]);
      console.log(`Alternative search results: ${altResults.length} records`);
      if (altResults.length > 0) {
        altResults.forEach((row, index) => {
          console.log(`[${index + 1}] ID: ${row.id}, Name: "${row.nm}", First: "${row.firstname}", Last: "${row.familiq}"`);
        });
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

testDatabase();

