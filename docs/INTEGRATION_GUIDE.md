# Poster Generation System - Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
bun add @fal-ai/serverless-client
```

### 2. Set Environment Variables

Create a `.env` file in the project root:

```env
# FIBO (Bria AI) API Key
FIBO_API_KEY=your_fibo_api_key_here
# OR
BRIA_API_KEY=your_bria_api_key_here

# FAL AI API Key
FAL_KEY=your_fal_api_key_here
# OR
FAL_API_KEY=your_fal_api_key_here

# Optional: Custom API URLs
FIBO_API_URL=https://api.fibo.com/v2
```

### 3. Basic Usage

```typescript
import { createFiboService, createFalService } from './services';
import { createPosterGenerationOrchestrator } from './services/posterGenerationOrchestrator';
import { transformerPaperBeginner } from './data/exampleSummaries';

// Initialize services
const fiboService = createFiboService();
const falService = createFalService();
const orchestrator = createPosterGenerationOrchestrator(fiboService, falService);

// Generate a poster
const result = await orchestrator.generate(transformerPaperBeginner);

if (result.status === 'complete') {
  console.log('Poster generated!', result.final_image_url);
} else {
  console.error('Generation failed:', result.error);
}
```

## Integration with Friend's System

Your friend's system provides the summarization output. Here's how to connect:

### Input Format (From Friend)

```typescript
interface FriendSystemOutput {
  summary: {
    title: string;
    one_liner: string;
    key_concepts: Array<{
      name: string;
      explanation: string;
      visual_metaphor: string; // This is key!
    }>;
    key_finding: string;
  };
  knowledge_level: "beginner" | "intermediate" | "advanced";
  user_preferences?: {
    background: string;
    preferred_colors?: string[];
  };
  tags: string[];
  arxiv_id: string;
}
```

### Integration Code

```typescript
// In your API endpoint or backend function
import { createPosterGenerationOrchestrator } from './services/posterGenerationOrchestrator';
import { createFiboService, createFalService } from './services';

export async function handlePosterGeneration(friendSystemOutput: FriendSystemOutput) {
  // Initialize orchestrator
  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService, falService);

  // Convert to GenerationInput format (they're compatible!)
  const input: GenerationInput = {
    ...friendSystemOutput,
    options: {
      include_layout_previews: false, // Set based on your needs
      include_variations: true,       // Generate color variations
      generation_mode: "high_quality" // or "fast"
    }
  };

  // Generate poster
  const result = await orchestrator.generate(input);

  return result;
}
```

## API Endpoint Example (Appwrite Function)

```typescript
// functions/generatePoster/src/main.ts
import { Client, Databases, Storage } from 'node-appwrite';
import { createPosterGenerationOrchestrator } from './services/posterGenerationOrchestrator';
import { createFiboService, createFalService } from './services';

export default async ({ req, res, log, error }) => {
  try {
    // Parse request
    const { summary, knowledge_level, user_preferences, tags, arxiv_id, options } = JSON.parse(req.body);

    // Initialize services
    const fiboService = createFiboService();
    const falService = createFalService();
    const orchestrator = createPosterGenerationOrchestrator(fiboService, falService);

    // Generate poster
    log('Starting poster generation...');
    const result = await orchestrator.generate({
      summary,
      knowledge_level,
      user_preferences,
      tags,
      arxiv_id,
      options: options || {
        include_layout_previews: false,
        include_variations: true,
        generation_mode: 'high_quality'
      }
    });

    if (result.status === 'complete') {
      // Optionally: Download image and store in Appwrite Storage
      const imageUrl = result.final_image_url;

      // For now, just return the URL
      return res.json({
        success: true,
        request_id: result.request_id,
        image_url: imageUrl,
        variations: result.variations,
        metadata: result.metadata
      });
    } else {
      error('Generation failed: ' + result.error);
      return res.json({
        success: false,
        error: result.error
      }, 500);
    }
  } catch (err) {
    error('Error:', err);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
```

## Testing the System

### Test with Example Data

```typescript
// test/posterGeneration.test.ts
import { createPosterGenerationOrchestrator } from '../services/posterGenerationOrchestrator';
import { createFiboService, createFalService } from '../services';
import { exampleSummaries } from '../data/exampleSummaries';

async function testPosterGeneration() {
  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService, falService);

  // Test with beginner level
  console.log('Testing beginner level...');
  const result1 = await orchestrator.generate(exampleSummaries.transformerBeginner);
  console.log('Result:', result1.status, result1.final_image_url);

  // Test with intermediate level
  console.log('Testing intermediate level...');
  const result2 = await orchestrator.generate(exampleSummaries.transformerIntermediate);
  console.log('Result:', result2.status, result2.final_image_url);

  // Test fast mode
  console.log('Testing fast mode...');
  const result3 = await orchestrator.generateFastMode(exampleSummaries.diffusionBeginner);
  console.log('Result:', result3.status, result3.final_image_url);
}

testPosterGeneration().catch(console.error);
```

### Test Services Connection

```typescript
import { createFiboService, createFalService } from './services';

async function testServices() {
  const fiboService = createFiboService();
  const falService = createFalService();

  console.log('Testing FIBO connection...');
  const fiboOk = await fiboService.testConnection();
  console.log('FIBO:', fiboOk ? '✓' : '✗');

  console.log('Testing FAL connection...');
  const falOk = await falService.testConnection();
  console.log('FAL:', falOk ? '✓' : '✗');
}

testServices();
```

## Generation Modes

### High Quality Mode (Default)

```typescript
const result = await orchestrator.generate({
  ...input,
  options: {
    include_layout_previews: true,  // Generate wireframes first (optional)
    include_variations: true,       // Generate 3 style variations
    generation_mode: 'high_quality' // Use FIBO for final render
  }
});
```

**Characteristics:**
- Uses FIBO for pixel-perfect text rendering
- Maximum control over layout and styling
- Generation time: 30-60 seconds
- Best for: Final posters, presentations, social media

### Fast Mode

```typescript
const result = await orchestrator.generateFastMode(input);
```

**Characteristics:**
- Uses FAL for rapid generation
- Generation time: 5-10 seconds
- Best for: Previews, rapid prototyping, free tier

## Customization Options

### Knowledge Levels

1. **Beginner (ELI5)**
   - Friendly, colorful design
   - Simple visual metaphors
   - Large, readable text
   - No technical jargon

2. **Intermediate (Engineer)**
   - Professional color scheme
   - Technical diagrams
   - Practical examples
   - Some technical terms

3. **Advanced (Researcher)**
   - Academic design
   - Mathematical notation
   - Dense information
   - Scholarly appearance

### User Preferences

```typescript
const input = {
  ...summary,
  user_preferences: {
    background: "biology",           // Adjust visual metaphors
    preferred_colors: ["blue", "green"], // Influence color scheme
    style_preference: "minimalist"   // Layout style hint
  }
};
```

### Tags

Tags influence layout and visual style:

```typescript
tags: ["visual", "conceptual"]      // More illustrations
tags: ["mathematical", "technical"] // More diagrams, equations
tags: ["theoretical"]               // Abstract representations
```

## Cost Optimization

### Caching Strategy

```typescript
// Implement caching to avoid regenerating identical posters
import { createHash } from 'crypto';

function getCacheKey(input: GenerationInput): string {
  const keyData = {
    arxiv_id: input.arxiv_id,
    knowledge_level: input.knowledge_level,
    // Add other relevant fields
  };
  return createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
}

// Check cache before generating
const cacheKey = getCacheKey(input);
const cached = await cache.get(cacheKey);
if (cached) {
  return cached;
}

// Generate and cache
const result = await orchestrator.generate(input);
await cache.set(cacheKey, result, { ttl: 86400 }); // 24 hours
```

### Tiered Access

```typescript
// Free tier: Fast mode only
if (user.tier === 'free') {
  result = await orchestrator.generateFastMode(input);
}

// Pro tier: Full features
if (user.tier === 'pro') {
  result = await orchestrator.generate({
    ...input,
    options: {
      include_layout_previews: true,
      include_variations: true,
      generation_mode: 'high_quality'
    }
  });
}
```

## Error Handling

```typescript
try {
  const result = await orchestrator.generate(input);

  if (result.status === 'failed') {
    // Handle generation failure
    if (result.error?.includes('FIBO')) {
      // Fallback to FAL
      console.log('FIBO failed, trying fast mode...');
      const fallback = await orchestrator.generateFastMode(input);
      return fallback;
    }

    throw new Error(result.error);
  }

  return result;
} catch (error) {
  console.error('Poster generation error:', error);

  // Log to monitoring service
  // Return error to user
  throw error;
}
```

## Monitoring & Analytics

```typescript
// Track generation metrics
const startTime = Date.now();
const result = await orchestrator.generate(input);
const endTime = Date.now();

// Log metrics
analytics.track('poster_generated', {
  request_id: result.request_id,
  knowledge_level: input.knowledge_level,
  num_concepts: input.summary.key_concepts.length,
  generation_time_ms: result.metadata.generation_time_ms,
  total_time_ms: endTime - startTime,
  status: result.status,
  included_variations: !!result.variations
});
```

## Troubleshooting

### FIBO API Errors

**Issue:** `FIBO API error (401): Unauthorized`
**Solution:** Check your `FIBO_API_KEY` environment variable

**Issue:** `FIBO generation timeout`
**Solution:** Increase `maxPollAttempts` in FiboService or use fast mode

### FAL API Errors

**Issue:** `FAL connection test failed`
**Solution:** Verify `FAL_KEY` is set correctly

**Issue:** `FAL generation error: NSFW content detected`
**Solution:** Some visual metaphors may trigger NSFW filters. Rephrase the metaphor.

### Text Rendering Issues

**Issue:** Text is too small or illegible in generated image
**Solution:** The system auto-scales based on text length. For very long text, consider:
- Shortening explanations
- Using intermediate or advanced level (smaller base font sizes)
- Breaking into multiple concepts

### Layout Issues

**Issue:** Too many concepts causing cramped layout
**Solution:** Maximum 7 concepts recommended. If more, consider:
- Combining related concepts
- Using advanced level (denser layout)
- Generating multiple posters

## Best Practices

1. **Visual Metaphors are Key**
   - The quality of generated posters heavily depends on good visual metaphors
   - Make them concrete and vivid: ✓ "spotlight on stage" vs ✗ "attention mechanism"

2. **Keep Explanations Concise**
   - Beginner: 1-2 sentences (< 100 characters)
   - Intermediate: 2-3 sentences (< 150 characters)
   - Advanced: 3-4 sentences (< 200 characters)

3. **Test with Examples First**
   - Use the provided `exampleSummaries` to test your setup
   - Verify API keys work before integrating with your friend's system

4. **Handle Failures Gracefully**
   - Always have a fallback to fast mode
   - Show users progress indicators during generation
   - Provide error messages that are actionable

5. **Cache Aggressively**
   - Same paper + same level = same poster
   - Cache final image URLs to reduce API costs
   - Cache can be storage bucket + database

## Next Steps

1. **Get API Keys**
   - Sign up for FIBO (Bria AI) at [https://fibo.ai](https://fibo.ai)
   - Sign up for FAL at [https://fal.ai](https://fal.ai)

2. **Test Locally**
   - Run the test script with example data
   - Verify both services connect successfully

3. **Integrate with Friend's System**
   - Establish the contract for the summary format
   - Create API endpoint that accepts their output
   - Test end-to-end flow

4. **Deploy**
   - Deploy as Appwrite Function or serverless function
   - Set environment variables in production
   - Monitor generation metrics

5. **Polish UI**
   - Build frontend components for displaying posters
   - Add download buttons, variation selection
   - Implement regeneration with different knowledge levels

---

**Questions?** Check the architecture document at `docs/poster-generation-architecture.md`
