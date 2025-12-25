/**
 * Test all environment variable configurations
 * Checks: Database, Supabase, Resend, and other required env vars
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function loadEnvFile(filePath: string, override: boolean) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const normalized = raw.replace(/^\s*export\s+/gm, '');
  const parsed = dotenv.parse(normalized);
  for (const [k, v] of Object.entries(parsed)) {
    if (override || process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}

// Load environment variables
loadEnvFile(path.join(process.cwd(), '.env'), false);
loadEnvFile(path.join(process.cwd(), '.env.local'), true);

interface TestResult {
  name: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, status: '✅' | '❌' | '⚠️', message: string) {
  results.push({ name, status, message });
  console.log(`${status} ${name}: ${message}`);
}

async function testDatabaseConnection() {
  console.log('\n📊 Testing Database Connection...');
  console.log('='.repeat(60));
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    addResult('DATABASE_URL', '❌', 'Not set');
    return;
  }

  try {
    const pool = new Pool({ 
      connectionString: databaseUrl, 
      ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined 
    });
    
    const result = await pool.query('SELECT version() as version, current_database() as db');
    addResult('DATABASE_URL', '✅', `Connected to ${result.rows[0].db}`);
    
    // Check for required tables
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const tableNames = tablesRes.rows.map((r: any) => r.table_name);
    addResult('Database Tables', '✅', `Found ${tableNames.length} tables: ${tableNames.slice(0, 5).join(', ')}${tableNames.length > 5 ? '...' : ''}`);
    
    await pool.end();
  } catch (error: any) {
    addResult('DATABASE_URL', '❌', `Connection failed: ${error.message}`);
  }
}

async function testDirectUrl() {
  console.log('\n🔗 Testing DIRECT_URL...');
  console.log('='.repeat(60));
  
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    addResult('DIRECT_URL', '⚠️', 'Not set (required for Prisma migrations)');
    return;
  }

  try {
    const pool = new Pool({ 
      connectionString: directUrl, 
      ssl: directUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined 
    });
    
    const result = await pool.query('SELECT current_database() as db');
    addResult('DIRECT_URL', '✅', `Connected to ${result.rows[0].db}`);
    
    await pool.end();
  } catch (error: any) {
    addResult('DIRECT_URL', '❌', `Connection failed: ${error.message}`);
  }
}

function testSupabaseConfig() {
  console.log('\n🔷 Testing Supabase Configuration...');
  console.log('='.repeat(60));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    addResult('NEXT_PUBLIC_SUPABASE_URL', '❌', 'Not set');
  } else {
    addResult('NEXT_PUBLIC_SUPABASE_URL', '✅', `Set to ${supabaseUrl}`);
  }
  
  if (!supabaseAnonKey) {
    addResult('NEXT_PUBLIC_SUPABASE_ANON_KEY', '❌', 'Not set');
  } else {
    const keyPreview = supabaseAnonKey.substring(0, 20) + '...';
    addResult('NEXT_PUBLIC_SUPABASE_ANON_KEY', '✅', `Set (${keyPreview})`);
  }
  
  if (!serviceRoleKey) {
    addResult('SUPABASE_SERVICE_ROLE_KEY', '⚠️', 'Not set (required for storage uploads)');
  } else {
    const keyPreview = serviceRoleKey.substring(0, 20) + '...';
    addResult('SUPABASE_SERVICE_ROLE_KEY', '✅', `Set (${keyPreview})`);
  }
  
  // Try to create Supabase client
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      addResult('Supabase Client', '✅', 'Client initialized successfully');
    } catch (error: any) {
      addResult('Supabase Client', '❌', `Failed to initialize: ${error.message}`);
    }
  }
}

function testResendConfig() {
  console.log('\n📧 Testing Resend Configuration...');
  console.log('='.repeat(60));
  
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  
  if (!resendKey) {
    addResult('RESEND_API_KEY', '❌', 'Not set');
    return;
  }
  
  if (!resendKey.startsWith('re_')) {
    addResult('RESEND_API_KEY', '⚠️', 'Key format looks incorrect (should start with "re_")');
  } else {
    addResult('RESEND_API_KEY', '✅', 'Set (format looks correct)');
  }
  
  if (fromEmail) {
    addResult('RESEND_FROM_EMAIL', '✅', `Set to ${fromEmail}`);
  } else {
    addResult('RESEND_FROM_EMAIL', '⚠️', 'Not set (will use default: onboarding@resend.dev)');
  }
  
  // Try to initialize Resend client
  try {
    const resend = new Resend(resendKey);
    addResult('Resend Client', '✅', 'Client initialized successfully');
  } catch (error: any) {
    addResult('Resend Client', '❌', `Failed to initialize: ${error.message}`);
  }
}

function testOtherConfig() {
  console.log('\n⚙️  Testing Other Configuration...');
  console.log('='.repeat(60));
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    addResult('NEXT_PUBLIC_BASE_URL', '✅', `Set to ${baseUrl}`);
  } else {
    addResult('NEXT_PUBLIC_BASE_URL', '⚠️', 'Not set (will default to localhost:3000)');
  }
  
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    addResult('ADMIN_EMAIL', '✅', `Set to ${adminEmail}`);
  } else {
    addResult('ADMIN_EMAIL', '⚠️', 'Not set');
  }
  
  const exposeLoginCode = process.env.EXPOSE_LOGIN_CODE;
  if (exposeLoginCode === 'true') {
    addResult('EXPOSE_LOGIN_CODE', '✅', 'Enabled (login codes will be visible)');
  } else {
    addResult('EXPOSE_LOGIN_CODE', '⚠️', 'Not set or disabled');
  }
}

async function main() {
  console.log('🔍 Environment Configuration Test');
  console.log('='.repeat(60));
  
  await testDatabaseConnection();
  await testDirectUrl();
  testSupabaseConfig();
  testResendConfig();
  testOtherConfig();
  
  console.log('\n📋 Summary');
  console.log('='.repeat(60));
  const success = results.filter(r => r.status === '✅').length;
  const warnings = results.filter(r => r.status === '⚠️').length;
  const errors = results.filter(r => r.status === '❌').length;
  
  console.log(`✅ Success: ${success}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Errors: ${errors}`);
  
  if (errors > 0) {
    console.log('\n❌ Some critical configurations are missing or incorrect!');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️  Some optional configurations are missing, but core functionality should work.');
    process.exit(0);
  } else {
    console.log('\n✅ All configurations look good!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

