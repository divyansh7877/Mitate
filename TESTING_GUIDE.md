# Testing Guide - Poster Generation System

## Step 1: Install Dependencies

```bash
bun install
```

This installs `@fal-ai/serverless-client` and all other dependencies.

## Step 2: Get API Keys

### FIBO (Bria AI)
1. Go to https://bria.ai or https://fibo.ai
2. Sign up for an account
3. Get your API key from the dashboard
4. **Note:** This is required for the Digital Ocean + FIBO hackathon

### FAL AI
1. Go to https://fal.ai
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. **Note:** This is required for the FIBO + FAL hackathon

## Step 3: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# In the root of your project
touch .env
```

Add your API keys:

```env
# FIBO (Bria AI) API Key
FIBO_API_KEY=your_fibo_api_key_here

# FAL AI API Key
FAL_KEY=your_fal_api_key_here

# Optional: Custom API URLs (use defaults if not specified)
# FIBO_API_URL=https://api.fibo.com/v2
```

## Step 4: Test Connection (Without Generating)

Before generating posters, test if your API keys work:

```typescript
// test-connection.ts
import { createFiboService } from './src/services/fiboService';
import { createFalService } from './src/services/falService';

async function testConnection() {
  console.log('Testing API connections...\n');

  try {
    const fiboService = createFiboService();
    const fiboOk = await fiboService.testConnection();
    console.log('FIBO:', fiboOk ? '✓ Connected' : '✗ Failed');
  } catch (error) {
    console.log('FIBO: ✗ Error -', error.message);
  }

  try {
    const falService = createFalService();
    const falOk = await falService.testConnection();
    console.log('FAL:', falOk ? '✓ Connected' : '✗ Failed');
  } catch (error) {
    console.log('FAL: ✗ Error -', error.message);
  }
}

testConnection();
```

Run it:
```bash
bun run test-connection.ts
```

## Step 5: Generate Your First Poster

### Option A: Use the Example Script

```bash
bun run src/examples/generatePosterExample.ts
```

This will run all the test examples. Edit the file to uncomment specific examples:

```typescript
// In src/examples/generatePosterExample.ts
async function main() {
  await example7_testConnections();        // Always run this first

  // Uncomment the ones you want to test:
  await example1_basicGeneration();        // Basic poster
  // await example2_fastMode();            // Fast mode (FAL only)
  // await example3_knowledgeLevels();     // Compare levels
  // await example4_styleVariations();     // Generate variations
}
```

### Option B: Create Your Own Test File

Create `test-poster.ts`:

```typescript
import { createFiboService } from './src/services/fiboService';
import { createFalService } from './src/services/falService';
import { createPosterGenerationOrchestrator } from './src/services/posterGenerationOrchestrator';
import { transformerPaperBeginner } from './src/data/exampleSummaries';

async function generatePoster() {
  console.log('Initializing services...');

  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  console.log('Generating poster...');
  console.log('This will take 30-60 seconds...\n');

  const result = await orchestrator.generate(transformerPaperBeginner);

  if (result.status === 'complete') {
    console.log('✓ SUCCESS!');
    console.log('Image URL:', result.final_image_url);
    console.log('Time:', result.metadata.generation_time_ms / 1000, 'seconds');

    if (result.variations) {
      console.log('\nStyle Variations:');
      result.variations.forEach(v => {
        console.log(`  - ${v.name}: ${v.url}`);
      });
    }
  } else {
    console.log('✗ FAILED');
    console.log('Error:', result.error);
  }
}

generatePoster().catch(console.error);
```

Run it:
```bash
bun run test-poster.ts
```

## Step 6: Test with Different Knowledge Levels

Try all three levels with the same paper:

```typescript
import {
  transformerPaperBeginner,
  transformerPaperIntermediate,
  transformerPaperAdvanced
} from './src/data/exampleSummaries';

// Test beginner
const result1 = await orchestrator.generate(transformerPaperBeginner);
console.log('Beginner:', result1.final_image_url);

// Test intermediate
const result2 = await orchestrator.generate(transformerPaperIntermediate);
console.log('Intermediate:', result2.final_image_url);

// Test advanced
const result3 = await orchestrator.generate(transformerPaperAdvanced);
console.log('Advanced:', result3.final_image_url);
```

Compare the visual styles!

## Step 7: Test Fast Mode (FAL Only)

If you want quick results for testing:

```typescript
// Fast mode uses only FAL - generates in 5-10 seconds
const quickResult = await orchestrator.generateFastMode(transformerPaperBeginner);
console.log('Quick poster:', quickResult.final_image_url);
```

**Note:** Fast mode is good for:
- Rapid prototyping
- Testing your data format
- Free tier / cost savings
- Quick previews

## Step 8: Add Your Own Paper Data

Edit `src/data/exampleSummaries.ts` and add your own:

```typescript
export const myCustomPaper: GenerationInput = {
  summary: {
    title: "Your Paper Title",
    one_liner: "A brief explanation",
    key_concepts: [
      {
        name: "Concept 1",
        explanation: "What it does...",
        visual_metaphor: "like a [concrete visual analogy]"
      },
      {
        name: "Concept 2",
        explanation: "How it works...",
        visual_metaphor: "similar to [something visual]"
      }
      // Add 1-7 concepts
    ],
    key_finding: "Main result or insight"
  },
  knowledge_level: "beginner",
  tags: ["visual", "conceptual"],
  arxiv_id: "1234.56789",
  options: {
    include_variations: true,
    generation_mode: "high_quality"
  }
};
```

Then test it:
```typescript
const result = await orchestrator.generate(myCustomPaper);
```

## Step 9: Inspect the Generated Prompt

Want to see what FIBO is receiving? Check the structured prompt:

```typescript
const result = await orchestrator.generate(transformerPaperBeginner);

if (result.status === 'complete') {
  console.log('FIBO Structured Prompt:');
  console.log(JSON.stringify(result.metadata.fibo_prompt, null, 2));
}
```

This shows you the exact objects, text elements, colors, etc.

## Step 10: Test with Your Friend's System

Once your friend's summarization system is ready, create an integration test:

```typescript
// integration-test.ts
import { createPosterGenerationOrchestrator } from './src/services/posterGenerationOrchestrator';
import { createFiboService, createFalService } from './src/services';

// Mock output from friend's system
const friendSystemOutput = {
  summary: {
    title: "Example Paper from Friend's System",
    one_liner: "This came from the summarizer",
    key_concepts: [
      // ... friend's data
    ],
    key_finding: "The main insight"
  },
  knowledge_level: "beginner",
  user_preferences: {
    background: "biology"
  },
  tags: ["visual"],
  arxiv_id: "1234.56789"
};

async function testIntegration() {
  const orchestrator = createPosterGenerationOrchestrator(
    createFiboService(),
    createFalService()
  );

  const result = await orchestrator.generate(friendSystemOutput);
  console.log('Integration test:', result.status);
  console.log('Image:', result.final_image_url);
}

testIntegration();
```

## Troubleshooting

### Issue: `FIBO_API_KEY environment variable is required`
**Solution:** Make sure `.env` file exists in the project root and contains `FIBO_API_KEY=your_key`

### Issue: `FAL_KEY environment variable is required`
**Solution:** Add `FAL_KEY=your_key` to `.env` file

### Issue: `FIBO API error (401): Unauthorized`
**Solution:** Your API key is invalid. Double-check it in the FIBO dashboard

### Issue: `Generation timeout after 120 seconds`
**Solution:** FIBO is taking too long. Increase timeout in `fiboService.ts` or use fast mode

### Issue: Text is too small/illegible in generated image
**Solution:**
- Shorten your explanations (< 150 characters)
- Use intermediate or advanced level (smaller base font sizes)
- Check `fiboPromptBuilder.ts` for font size calculations

### Issue: Too many concepts causing cramped layout
**Solution:**
- Maximum 7 concepts recommended
- Consider combining related concepts
- Use advanced level for denser layouts

## Performance Benchmarks

Based on testing:

| Mode | Service | Time | Cost | Quality |
|------|---------|------|------|---------|
| High-Quality | FIBO + FAL | 30-60s | $$ | Best |
| Fast | FAL only | 5-10s | $ | Good |
| With Previews | FAL → FIBO | 40-70s | $$$ | Best + Options |
| With Variations | FIBO + FAL variations | 50-80s | $$$ | Best + Choices |

## Next Steps After Testing

1. ✅ Verify both API keys work
2. ✅ Generate at least one poster successfully
3. ✅ Test with your own paper data
4. ⏳ Build frontend UI to display posters
5. ⏳ Connect to friend's summarization API
6. ⏳ Add download/share features
7. ⏳ Deploy to Digital Ocean

## Quick Reference: Available Examples

All examples are in `src/data/exampleSummaries.ts`:

```typescript
import {
  transformerPaperBeginner,      // Attention Is All You Need (beginner)
  transformerPaperIntermediate,  // Attention Is All You Need (intermediate)
  transformerPaperAdvanced,      // Attention Is All You Need (advanced)
  resnetPaperBeginner,          // ResNet (beginner)
  gptPaperIntermediate,         // GPT (intermediate)
  diffusionPaperBeginner,       // Diffusion Models (beginner)
  exampleSummaries,             // Object with all examples
  getRandomExample,             // Helper function
  getExamplesByLevel            // Filter by level
} from './src/data/exampleSummaries';
```

## Example Output

When successful, you'll see:

```
✓ Poster generated successfully!
  Request ID: gen_1702472400000_abc123def
  Image URL: https://fal.ai/files/generated/poster_xyz.png
  Generation time: 45230 ms
  FIBO seed: 42857
  Variations generated: 3
    1. Vibrant: https://...
    2. Dark Mode: https://...
    3. Pastel: https://...
```

Download the image URL to see your poster!

---

**Need Help?** Check:
- Architecture: `docs/poster-generation-architecture.md`
- Integration: `docs/INTEGRATION_GUIDE.md`
- README: `docs/POSTER_SYSTEM_README.md`
