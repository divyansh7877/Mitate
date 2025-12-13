/**
 * Quick API Connection Test
 * Run this first to verify your FIBO API key works
 * (FAL is optional and not tested here)
 */

import { createFiboService } from './src/services/fiboService';

async function testConnections() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Testing FIBO API Connection          ║');
  console.log('╚════════════════════════════════════════╝\n');

  let fiboOk = false;

  // Test FIBO (required)
  console.log('Testing FIBO (Bria AI) connection...');
  try {
    const fiboService = createFiboService();
    fiboOk = await fiboService.testConnection();

    if (fiboOk) {
      console.log('✓ FIBO: Connected successfully\n');
    } else {
      console.log('✗ FIBO: Connection failed (check API response)\n');
    }
  } catch (error: any) {
    console.log('✗ FIBO: Error -', error.message);
    if (error.message.includes('required')) {
      console.log('  → Make sure FIBO_API_KEY is set in .env file\n');
    } else {
      console.log('  → Check your API key is valid\n');
    }
  }

  // Summary
  console.log('─────────────────────────────────────────');
  if (fiboOk) {
    console.log('✓ FIBO service connected successfully!');
    console.log('\nYou\'re ready to generate posters.');
    console.log('Next: Run `bun run test-poster.ts`\n');
    console.log('Note: FAL AI is optional and not required.');
  } else {
    console.log('✗ FIBO connection failed.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure .env file exists in project root');
    console.log('2. Check your .env has:');
    console.log('   FIBO_API_KEY=your_fibo_key');
    console.log('3. Get your API key from:');
    console.log('   https://fibo.ai or https://bria.ai\n');
    process.exit(1);
  }
}

testConnections().catch((error) => {
  console.error('\nUnexpected error:', error);
  process.exit(1);
});
