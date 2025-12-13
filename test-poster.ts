/**
 * Simple Poster Generation Test
 * Run this after test-connection.ts succeeds
 */

import { createFiboService } from './src/services/fiboService';
import { createPosterGenerationOrchestrator } from './src/services/posterGenerationOrchestrator';
import { vitPaperBeginner } from './src/data/exampleSummary2';

async function generateTestPoster() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Poster Generation Test (FIBO Only)   ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('Paper:', vitPaperBeginner.summary.title);
  console.log('Level:', vitPaperBeginner.knowledge_level);
  console.log('Concepts:', vitPaperBeginner.summary.key_concepts.length);
  console.log('\n⏳ Initializing FIBO service...\n');

  const fiboService = createFiboService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService);

  console.log('⏳ Generating poster...');
  console.log('   This will take 30-60 seconds...\n');

  const startTime = Date.now();

  try {
    const result = await orchestrator.generate({
    ...vitPaperBeginner,
    options: {
      generation_mode: "modular"
    }
  });

    const totalTime = Date.now() - startTime;

    if (result.status === 'complete') {
      console.log('✓ SUCCESS!\n');
      console.log('─────────────────────────────────────────');
      console.log('Request ID:', result.request_id);
      console.log('Image URL:', result.final_image_url);
      console.log('Generation time:', (result.metadata.generation_time_ms / 1000).toFixed(1), 'seconds');
      console.log('Total time:', (totalTime / 1000).toFixed(1), 'seconds');
      console.log('FIBO seed:', result.metadata.fibo_seed);
      console.log('─────────────────────────────────────────\n');

      console.log('✓ Open the image URL in your browser to see the poster!\n');

      console.log('Next steps:');
      console.log('1. Test different levels: Use transformerPaperIntermediate or transformerPaperAdvanced');
      console.log('2. Add your own paper data in src/data/exampleSummaries.ts');
      console.log('3. Integrate with your friend\'s summarization system');
      console.log('4. Build frontend UI to display posters\n');

    } else {
      console.log('✗ GENERATION FAILED\n');
      console.log('Status:', result.status);
      console.log('Error:', result.error);
      console.log('\nCheck TESTING_GUIDE.md for troubleshooting\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.log('✗ ERROR\n');
    console.error('Message:', error.message);
    console.error('\nFull error:', error);
    console.log('\nTroubleshooting:');
    console.log('- Check your API key is valid');
    console.log('- Ensure you have credits/quota in your FIBO account');
    console.log('- Check TESTING_GUIDE.md for more help\n');
    process.exit(1);
  }
}

// Run the test
generateTestPoster().catch((error) => {
  console.error('\nUnexpected error:', error);
  process.exit(1);
});
