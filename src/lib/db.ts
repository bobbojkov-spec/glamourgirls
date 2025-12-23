import { Pool } from 'pg';
import type { QueryResult } from 'pg';

// Singleton pattern to ensure only one pool instance
// In Next.js 16, we need to be more careful about pool lifecycle
let pool: Pool | null = null;
let poolCreationTime = 0;
const POOL_MAX_AGE = 5 * 60 * 1000; // 5 minutes - recreate pool more frequently to prevent connection buildup

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  const useDatabaseUrl = Boolean(databaseUrl && databaseUrl.startsWith('postgres'));

  // Warn if DATABASE_URL is not set in production
  if (!databaseUrl && process.env.NODE_ENV === 'production') {
    console.error('⚠️ WARNING: DATABASE_URL is not set in production! Falling back to localhost.');
  }

  const dbConfig = useDatabaseUrl
    ? {
        connectionString: databaseUrl!,
        // Supabase requires SSL for external connections
        ssl: databaseUrl!.includes('supabase.co')
          ? { rejectUnauthorized: false }
          : undefined,
        // PostgreSQL connection pool settings
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Increased to 10 seconds
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || process.env.USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'glamourgirls',
        // PostgreSQL connection pool settings
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Increased to 10 seconds
      };
  
  // Log database configuration (without password)
  console.log('🔌 Database Configuration (PostgreSQL):');
  if (useDatabaseUrl) {
    const urlPreview = databaseUrl!.substring(0, 30) + '...';
    console.log('  Using DATABASE_URL:', urlPreview);
    console.log('  SSL:', dbConfig.ssl ? 'enabled' : 'disabled');
  } else {
    console.log('  ⚠️ Using fallback localhost configuration');
    console.log('  Host:', (dbConfig as any).host);
    console.log('  Port:', (dbConfig as any).port);
    console.log('  User:', (dbConfig as any).user);
    console.log('  Database:', (dbConfig as any).database);
    console.log('  Password:', (dbConfig as any).password ? '***' : '(empty)');
    if (process.env.NODE_ENV === 'production') {
      console.error('  ❌ ERROR: This will fail in production! DATABASE_URL must be set.');
    }
  }
  
  const newPool = new Pool(dbConfig);

  // Handle connection errors
  newPool.on('connect', (client) => {
    console.log('✅ New PostgreSQL connection established');
  });

  newPool.on('error', (err) => {
    console.error('❌ PostgreSQL Pool Error:', err.message);
    // Mark pool for recreation on next request
      pool = null;
  });

  return newPool;
}

export function getPool(): Pool {
  const now = Date.now();
  
  // Recreate pool if it's too old (Next.js 16 hot reload can cause stale pools)
  // REDUCED from 30 minutes to 5 minutes for faster cleanup
  if (pool && (now - poolCreationTime) > POOL_MAX_AGE) {
    console.log('🔄 Pool is old (5+ min), recreating...');
    try {
      // Properly close old pool and wait for connections to close
      pool.end().catch(() => {}); // Try to close old pool, ignore errors
    } catch (e) {
      // Ignore errors when closing
    }
    pool = null;
  }

  // Recreate pool if it doesn't exist or was closed
  if (!pool) {
    console.log('🔄 Creating new PostgreSQL connection pool...');
    pool = createPool();
    poolCreationTime = now;
  }
  
  return pool;
}

// Helper to reset pool if we hit connection errors
export async function resetPool() {
  if (pool) {
    console.log('🔄 Resetting connection pool...');
    try {
      // Force close all connections
      await pool.end();
      // Wait a bit for connections to fully close
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      // Ignore errors
    }
    pool = null;
  }
}

// Helper to get pool stats for debugging
export async function getPoolStats() {
  if (!pool) {
    return { exists: false };
  }
  try {
    const result = await pool.query('SELECT count(*) as total FROM pg_stat_activity WHERE datname = current_database()');
    return {
      exists: true,
      connections: result.rows[0]?.total || 0,
    };
  } catch (e) {
    return { exists: true, error: 'Could not get stats' };
  }
}

// Create a wrapper object that mimics mysql2's pool interface
// This allows existing code using pool.execute() to work without changes
class PoolWrapper {
  private getPoolInstance(): Pool {
    return getPool();
  }

  // Execute method that mimics mysql2's execute
  async execute(sql: string, params?: any[]): Promise<[any[], any]> {
    return execute(sql, params);
  }

  // Direct query method
  async query(sql: string, params?: any[]): Promise<QueryResult> {
    const pool = this.getPoolInstance();
    // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
    let pgSql = sql;
    if (params && params.length > 0) {
      let paramIndex = 1;
      pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    return pool.query(pgSql, params);
  }

  // End method for pool cleanup
  async end(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
}

// Export a wrapper instance that provides mysql2-compatible interface
const poolWrapper = new PoolWrapper();
export default poolWrapper;

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    if (pool) {
      await pool.end();
      pool = null;
    }
  });
  
  process.on('SIGTERM', async () => {
    if (pool) {
      await pool.end();
      pool = null;
    }
  });
}

// Helper function to execute queries with proper connection management
// Converts MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
export async function query(sql: string, params?: any[]): Promise<any[]> {
  const currentPool = getPool();
  try {
    // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
    let pgSql = sql;
    if (params && params.length > 0) {
      let paramIndex = 1;
      pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    
    // Add query timeout to prevent hanging queries
    const result: QueryResult = await Promise.race([
      currentPool.query(pgSql, params),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 30000)
      )
    ]);
    
    return result.rows;
  } catch (error: any) {
    console.error('Query error:', error);
    // If it's a connection timeout, try to reset the pool
    if (error.message?.includes('timeout') || error.message?.includes('Connection terminated')) {
      console.warn('Connection timeout detected, resetting pool...');
      pool = null; // Force pool recreation on next request
    }
    throw error;
  }
}

// Helper function that mimics mysql2's execute method for compatibility
export async function execute(sql: string, params?: any[]): Promise<[any[], any]> {
  const rows = await query(sql, params);
  // Return in format similar to mysql2: [rows, fields]
  // For PostgreSQL, we don't have separate fields metadata, so return empty array
  return [rows, []];
}
