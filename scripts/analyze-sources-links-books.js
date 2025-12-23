const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function analyzeDatabase() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'glamourgirls',
    });

    console.log('=== Database Analysis: Sources, Links, and Books ===\n');

    // Check if tables exist
    console.log('1. Checking table structures...\n');
    
    // Check girllinks table
    try {
      const [linkStructure] = await connection.execute('DESCRIBE girllinks');
      console.log('✓ girllinks table exists');
      console.log('  Structure:', linkStructure.map((col) => `${col.Field} (${col.Type})`).join(', '));
    } catch (e) {
      console.log('✗ girllinks table does NOT exist');
    }

    // Check girlbooks table
    try {
      const [bookStructure] = await connection.execute('DESCRIBE girlbooks');
      console.log('✓ girlbooks table exists');
      console.log('  Structure:', bookStructure.map((col) => `${col.Field} (${col.Type})`).join(', '));
    } catch (e) {
      console.log('✗ girlbooks table does NOT exist');
    }

    // Check girls table for sources column
    try {
      const [girlStructure] = await connection.execute('DESCRIBE girls');
      const sourcesCol = girlStructure.find((col) => col.Field === 'sources');
      if (sourcesCol) {
        console.log('✓ girls.sources column exists');
      } else {
        console.log('✗ girls.sources column does NOT exist');
      }
    } catch (e) {
      console.log('✗ Could not check girls table');
    }

    console.log('\n2. Querying data for actress ID 1 (Julie Adams)...\n');

    // Get sources from girls table
    try {
      const [sources] = await connection.execute(
        'SELECT id, nm, sources FROM girls WHERE id = 1'
      );
      if (sources.length > 0) {
        console.log('Sources from girls table:');
        console.log('  ID:', sources[0].id);
        console.log('  Name:', sources[0].nm);
        console.log('  Sources:', sources[0].sources || '(empty)');
        console.log('  Sources length:', sources[0].sources ? sources[0].sources.length : 0);
      } else {
        console.log('✗ No actress found with ID 1');
      }
    } catch (e) {
      console.log('✗ Error querying sources:', e.message);
    }

    // Get links from girllinks table
    try {
      const [links] = await connection.execute(
        'SELECT * FROM girllinks WHERE girlid = 1 ORDER BY ord ASC'
      );
      console.log('\nLinks from girllinks table:');
      if (links.length > 0) {
        console.log(`  Found ${links.length} links:`);
        links.forEach((link, index) => {
          console.log(`  ${index + 1}. ID: ${link.id}, Text: "${link.text || link.text || 'N/A'}", URL: ${link.url || link.link || 'N/A'}, Order: ${link.ord || 0}`);
        });
      } else {
        console.log('  No links found for actress ID 1');
      }
    } catch (e) {
      console.log('✗ Error querying links:', e.message);
    }

    // Get books from girlbooks table
    try {
      const [books] = await connection.execute(
        'SELECT * FROM girlbooks WHERE girlid = 1 ORDER BY ord ASC'
      );
      console.log('\nBooks from girlbooks table:');
      if (books.length > 0) {
        console.log(`  Found ${books.length} books:`);
        books.forEach((book, index) => {
          console.log(`  ${index + 1}. ID: ${book.id}, Title: "${book.title || 'N/A'}", URL: ${book.url || book.link || 'N/A'}, Order: ${book.ord || 0}`);
        });
      } else {
        console.log('  No books found for actress ID 1');
      }
    } catch (e) {
      console.log('✗ Error querying books:', e.message);
    }

    // Check all actresses with links/books
    console.log('\n3. Checking all actresses with links/books...\n');
    
    try {
      const [allLinks] = await connection.execute(
        'SELECT girlid, COUNT(*) as count FROM girllinks GROUP BY girlid'
      );
      if (allLinks.length > 0) {
        console.log('Actresses with links:');
        allLinks.forEach((row) => {
          console.log(`  Actress ID ${row.girlid}: ${row.count} links`);
        });
      } else {
        console.log('  No actresses have links');
      }
    } catch (e) {
      console.log('  Could not query links (table may not exist)');
    }

    try {
      const [allBooks] = await connection.execute(
        'SELECT girlid, COUNT(*) as count FROM girlbooks GROUP BY girlid'
      );
      if (allBooks.length > 0) {
        console.log('\nActresses with books:');
        allBooks.forEach((row) => {
          console.log(`  Actress ID ${row.girlid}: ${row.count} books`);
        });
      } else {
        console.log('\n  No actresses have books');
      }
    } catch (e) {
      console.log('\n  Could not query books (table may not exist)');
    }

    console.log('\n=== Analysis Complete ===\n');

  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

analyzeDatabase();

