/**
 * Check actual column names in girls table
 */

import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'glamourgirls',
  waitForConnections: true,
  connectionLimit: 10,
});

async function checkColumns() {
  try {
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'girls'
       ORDER BY COLUMN_NAME`
    ) as any[];

    console.log('All columns in girls table:');
    columns.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();

