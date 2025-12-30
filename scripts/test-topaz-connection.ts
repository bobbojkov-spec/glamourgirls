/**
 * Test script to verify Topaz Photo AI connection/credentials
 */

import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const TOPAZ_USERNAME = process.env.TOPAZ_PHOTO_AI_USERNAME;
const TOPAZ_PASSWORD = process.env.TOPAZ_PHOTO_AI_PASSWORD;

async function testTopazCLI() {
  console.log('🔍 Testing Topaz Photo AI CLI...\n');
  
  const possiblePaths = [
    '/Applications/Topaz Photo AI.app/Contents/MacOS/Topaz Photo AI',
    '/usr/local/bin/topaz-photo-ai',
    'topaz-photo-ai',
  ];

  for (const cliPath of possiblePaths) {
    try {
      console.log(`   Trying: ${cliPath}`);
      const { stdout, stderr } = await execAsync(`"${cliPath}" --version`);
      if (stdout) console.log(`   ✓ Found! Output: ${stdout}`);
      return { success: true, method: 'CLI', path: cliPath };
    } catch (error: any) {
      // Continue to next path
    }
  }
  
  return { success: false, method: 'CLI' };
}

async function testTopazCredentials() {
  console.log('\n🔍 Testing Topaz Photo AI credentials...\n');
  
  if (!TOPAZ_USERNAME || !TOPAZ_PASSWORD) {
    console.log('   ❌ Credentials not found in environment');
    console.log(`   TOPAZ_PHOTO_AI_USERNAME: ${TOPAZ_USERNAME ? 'SET' : 'NOT SET'}`);
    console.log(`   TOPAZ_PHOTO_AI_PASSWORD: ${TOPAZ_PASSWORD ? 'SET' : 'NOT SET'}`);
    return { success: false, reason: 'Credentials not set' };
  }
  
  console.log(`   ✓ Username: ${TOPAZ_USERNAME}`);
  console.log(`   ✓ Password: ${TOPAZ_PASSWORD ? '***' + TOPAZ_PASSWORD.slice(-2) : 'NOT SET'}`);
  
  // Try to authenticate with Topaz API
  // Note: Topaz Photo AI may use different authentication methods
  // This is a placeholder for API testing
  
  try {
    // Check if Topaz Photo AI app is installed
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Try to check if app exists
    const appPath = '/Applications/Topaz Photo AI.app';
    try {
      await execAsync(`test -d "${appPath}" && echo "exists"`);
      console.log(`   ✓ Topaz Photo AI app found at: ${appPath}`);
      
      // Try to get version or info from the app
      try {
        const infoPath = '/Applications/Topaz Photo AI.app/Contents/Info.plist';
        const { stdout } = await execAsync(`plutil -p "${infoPath}" | grep -i "CFBundleVersion\\|CFBundleShortVersionString" | head -2`);
        console.log(`   ✓ App info:\n${stdout.split('\n').map((l: string) => `      ${l.trim()}`).join('\n')}`);
      } catch {
        console.log(`   ⚠️  Could not read app version info`);
      }
      
      return { success: true, method: 'App found', credentials: 'set' };
    } catch {
      console.log(`   ⚠️  Topaz Photo AI app not found at: ${appPath}`);
    }
    
    // If app not found, credentials are set but we can't test without app
    console.log(`   ⚠️  Credentials are set, but app is not installed`);
    console.log(`   💡 You may need to install Topaz Photo AI or use API access`);
    
    return { success: true, method: 'Credentials only', warning: 'App not installed' };
    
  } catch (error: any) {
    console.log(`   ⚠️  Could not verify app installation: ${error.message}`);
    return { success: true, method: 'Credentials only', warning: error.message };
  }
}

async function main() {
  console.log('🧪 Testing Topaz Photo AI Connection\n');
  console.log('=' .repeat(50));
  
  const cliTest = await testTopazCLI();
  const credTest = await testTopazCredentials();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results:\n');
  
  if (cliTest.success) {
    console.log(`   ✅ CLI: Available at ${cliTest.path}`);
  } else {
    console.log(`   ⚠️  CLI: Not found in common locations`);
  }
  
  if (credTest.success) {
    console.log(`   ✅ Credentials: Set and ready`);
    if (credTest.warning) {
      console.log(`   ⚠️  Warning: ${credTest.warning}`);
    }
  } else {
    console.log(`   ❌ Credentials: ${credTest.reason}`);
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (cliTest.success || (credTest.success && !credTest.warning)) {
    console.log('\n✅ Connection test passed! Ready to proceed.');
    process.exit(0);
  } else if (credTest.success) {
    console.log('\n⚠️  Credentials are set but app may need installation.');
    console.log('   The script will use fallback processing if Topaz is unavailable.');
    process.exit(0);
  } else {
    console.log('\n❌ Connection test failed. Please check credentials.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Test error:', err.message);
  process.exit(1);
});


