/**
 * Kill MySQL connections to fix "too many connections" error
 * This script kills all connections except the current one
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function killConnections() {
  let connection: mysql.Connection | null = null;
  
  try {
    // Create a single connection (not a pool) for this operation
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'glamourgirls',
    });

    console.log('🔍 Checking MySQL connections...\n');

    // Get current connection ID
    const [currentConn] = await connection.execute(
      `SELECT CONNECTION_ID() as id`
    ) as any[];
    const currentId = currentConn[0]?.id;
    console.log(`📌 Current connection ID: ${currentId}\n`);

    // List all connections
    const [allConnections] = await connection.execute(
      `SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE
      FROM information_schema.PROCESSLIST
      WHERE USER != 'system user'
      ORDER BY TIME DESC`
    ) as any[];

    console.log(`📋 Found ${allConnections.length} connections\n`);

    let killed = 0;
    for (const conn of allConnections) {
      if (conn.ID !== currentId) {
        try {
          await connection.execute(`KILL ${conn.ID}`);
          console.log(`✅ Killed connection ${conn.ID} (User: ${conn.USER}, Time: ${conn.TIME}s)`);
          killed++;
        } catch (e: any) {
          console.log(`⚠️  Could not kill ${conn.ID}: ${e.message}`);
        }
      }
    }

    console.log(`\n✅ Killed ${killed} connections`);
    console.log('💡 You can now try your queries again');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_CON_COUNT_ERROR') {
      console.error('\n⚠️  Cannot connect - too many connections!');
      console.error('💡 Try restarting MySQL server:');
      console.error('   macOS: brew services restart mysql');
      console.error('   Linux: sudo systemctl restart mysql');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

killConnections();

