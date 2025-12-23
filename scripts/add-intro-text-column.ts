/**
 * Add introText column to girls table
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

async function addIntroTextColumn() {
  try {
    // Check if column exists
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'girls'
       AND COLUMN_NAME = 'introText'`
    ) as any[];

    if (columns.length > 0) {
      console.log('✓ introText column already exists');
      return;
    }

    // Add column
    await pool.execute(
      `ALTER TABLE girls ADD COLUMN introText TEXT DEFAULT NULL`
    );

    console.log('✅ introText column added successfully');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ introText column already exists');
    } else {
      console.error('Error adding column:', error);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

addIntroTextColumn();

