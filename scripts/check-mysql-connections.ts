/**
 * Check MySQL connection status and count
 * Helps diagnose "too many connections" errors
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkConnections() {
  let connection: mysql.Connection | null = null;
  
  try {
    // Create a single connection (not a pool) for diagnostics
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'glamourgirls',
    });

    console.log('🔍 Checking MySQL connection status...\n');

    // Check max connections
    const [maxConn] = await connection.execute(
      `SHOW VARIABLES LIKE 'max_connections'`
    ) as any[];
    const maxConnections = maxConn[0]?.Value || 'unknown';
    console.log(`📊 Max Connections: ${maxConnections}`);

    // Check current connections
    const [currentConn] = await connection.execute(
      `SHOW STATUS LIKE 'Threads_connected'`
    ) as any[];
    const currentConnections = currentConn[0]?.Value || '0';
    console.log(`📊 Current Connections: ${currentConnections}`);

    // Check running connections
    const [runningConn] = await connection.execute(
      `SHOW STATUS LIKE 'Threads_running'`
    ) as any[];
    const runningConnections = runningConn[0]?.Value || '0';
    console.log(`📊 Running Connections: ${runningConnections}`);

    // List all connections
    const [allConnections] = await connection.execute(
      `SELECT 
        ID, 
        USER, 
        HOST, 
        DB, 
        COMMAND, 
        TIME, 
        STATE, 
        INFO
      FROM information_schema.PROCESSLIST
      ORDER BY TIME DESC`
    ) as any[];

    console.log(`\n📋 All Active Connections (${allConnections.length}):`);
    console.log('─'.repeat(100));
    allConnections.forEach((conn: any) => {
      console.log(`ID: ${conn.ID} | User: ${conn.USER} | Host: ${conn.HOST} | DB: ${conn.DB || 'NULL'} | Command: ${conn.COMMAND} | Time: ${conn.TIME}s | State: ${conn.STATE || 'NULL'}`);
      if (conn.INFO) {
        console.log(`  Query: ${conn.INFO.substring(0, 80)}${conn.INFO.length > 80 ? '...' : ''}`);
      }
    });

    const usagePercent = (parseInt(currentConnections) / parseInt(maxConnections)) * 100;
    console.log(`\n📈 Connection Usage: ${usagePercent.toFixed(1)}%`);
    
    if (usagePercent > 80) {
      console.log('⚠️  WARNING: Connection usage is above 80%!');
    }

  } catch (error: any) {
    console.error('❌ Error checking connections:', error.message);
    if (error.code === 'ER_CON_COUNT_ERROR') {
      console.error('⚠️  Cannot connect - too many connections already!');
      console.error('💡 Try: mysql -u root -e "KILL <process_id>;" to kill specific connections');
      console.error('💡 Or restart MySQL server to reset all connections');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkConnections();

