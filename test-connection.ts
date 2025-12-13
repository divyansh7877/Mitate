/**
 * Quick API Connection Test
 * Run this first to verify your API keys work
 */

import { createFiboService } from './src/services/fiboService';
import { createFalService } from './src/services/falService';

async function testConnections() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Testing API Connections              ║');
  console.log('╚════════════════════════════════════════╝\n');

  let allGood = true;

  // Test FIBO
  console.log('Testing FIBO (Bria AI) connection...');
  try {
    const fiboService = createFiboService();
    const fiboOk = await fiboService.testConnection();

    if (fiboOk) {
      console.log('✓ FIBO: Connected successfully\n');
    } else {
      console.log('✗ FIBO: Connection failed (check API response)\n');
      allGood = false;
    }
  } catch (error: any) {
    console.log('✗ FIBO: Error -', error.message);
    if (error.message.includes('required')) {
      console.log('  → Make sure FIBO_API_KEY is set in .env file\n');
    } else {
      console.log('  → Check your API key is valid\n');
    }
    allGood = false;
  }

  // Test FAL
  console.log('Testing FAL AI connection...');
  try {
    const falService = createFalService();
    const falOk = await falService.testConnection();

    if (falOk) {
      console.log('✓ FAL: Connected successfully\n');
    } else {
      console.log('✗ FAL: Connection failed (check API response)\n');
      allGood = false;
    }
  } catch (error: any) {
    console.log('✗ FAL: Error -', error.message);
    if (error.message.includes('required')) {
      console.log('  → Make sure FAL_KEY is set in .env file\n');
    } else {
      console.log('  → Check your API key is valid\n');
    }
    allGood = false;
  }

  // Summary
  console.log('─────────────────────────────────────────');
  if (allGood) {
    console.log('✓ All services connected successfully!');
    console.log('\nYou\'re ready to generate posters.');
    console.log('Next: Run `bun run test-poster.ts`\n');
  } else {
    console.log('✗ Some services failed to connect.');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure .env file exists in project root');
    console.log('2. Check your .env has these keys:');
    console.log('   FIBO_API_KEY=your_fibo_key');
    console.log('   FAL_KEY=your_fal_key');
    console.log('3. Verify API keys from:');
    console.log('   FIBO: https://fibo.ai or https://bria.ai');
    console.log('   FAL: https://fal.ai\n');
    process.exit(1);
  }
}

testConnections().catch((error) => {
  console.error('\nUnexpected error:', error);
  process.exit(1);
});
