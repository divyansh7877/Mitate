# Quick Start - FIBO Only Mode

This guide gets you up and running with **FIBO (Bria AI) only** - no FAL required!

## Prerequisites

- Bun installed
- FIBO API key (get from https://bria.ai or https://fibo.ai)

## Steps

### 1. Install Dependencies

```bash
bun install
```

### 2. Get Your FIBO API Key

1. Go to https://bria.ai or https://fibo.ai
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy it

### 3. Create `.env` File

In the project root:

```bash
touch .env
```

Add your FIBO key:

```env
FIBO_API_KEY=your_fibo_api_key_here
```

**That's it!** FAL is optional and not needed.

### 4. Test Connection

```bash
bun run test-connection.ts
```

You should see:
```
✓ FIBO: Connected successfully

✓ FIBO service connected successfully!
You're ready to generate posters.
```

### 5. Generate Your First Poster

```bash
bun run test-poster.ts
```

This will:
1. Initialize FIBO service
2. Generate a poster for the Transformer paper (beginner level)
3. Return an image URL

**Time:** 30-60 seconds

**Output:**
```
✓ SUCCESS!

Image URL: https://...
Generation time: 45.2 seconds
```

Open the URL in your browser to see your poster!

## What You Get

### Beginner Level Poster
- Bright, friendly colors
- Simple visual metaphors
- Large readable text
- Vertical flow layout
- 3 key concepts explained simply

### All Automatic
- ✅ Layout calculation (vertical/grid/academic)
- ✅ Color scheme selection (based on level)
- ✅ Font sizing (auto-scales for text length)
- ✅ Object positioning (mathematically calculated)
- ✅ Visual metaphor integration

## Testing Different Levels

Edit `test-poster.ts` and change the import:

```typescript
// Beginner
import { transformerPaperBeginner } from './src/data/exampleSummaries';

// Intermediate
import { transformerPaperIntermediate } from './src/data/exampleSummaries';

// Advanced
import { transformerPaperAdvanced } from './src/data/exampleSummaries';
```

Then run `bun run test-poster.ts` again.

## Add Your Own Papers

Edit `src/data/exampleSummaries.ts`:

```typescript
export const myPaper: GenerationInput = {
  summary: {
    title: "Your Paper Title",
    one_liner: "Brief one-line explanation",
    key_concepts: [
      {
        name: "Concept 1",
        explanation: "What it does (1-2 sentences)",
        visual_metaphor: "like a spotlight on stage" // Be concrete!
      },
      {
        name: "Concept 2",
        explanation: "How it works (1-2 sentences)",
        visual_metaphor: "similar to a tower with floors"
      }
      // 3-7 concepts recommended
    ],
    key_finding: "Main result of the paper"
  },
  knowledge_level: "beginner", // or "intermediate" or "advanced"
  tags: ["visual", "conceptual"],
  arxiv_id: "1234.56789"
};
```

Then use it:
```typescript
const result = await orchestrator.generate(myPaper);
```

## Integration with Your Friend's System

Once your friend's summarization system is ready:

```typescript
import { createFiboService } from './src/services/fiboService';
import { createPosterGenerationOrchestrator } from './src/services/posterGenerationOrchestrator';

// Get summary from friend's system
const summary = await friendSystem.getSummary(paperId);

// Generate poster
const orchestrator = createPosterGenerationOrchestrator(
  createFiboService()
);

const result = await orchestrator.generate({
  summary: summary.summary,
  knowledge_level: summary.knowledge_level,
  tags: summary.tags,
  arxiv_id: summary.arxiv_id
});

console.log('Poster URL:', result.final_image_url);
```

## API Usage Example

```typescript
import { createFiboService } from './src/services/fiboService';
import { createPosterGenerationOrchestrator } from './src/services/posterGenerationOrchestrator';

const fiboService = createFiboService();
const orchestrator = createPosterGenerationOrchestrator(fiboService);

const result = await orchestrator.generate({
  summary: {
    title: "Your Paper",
    one_liner: "Brief explanation",
    key_concepts: [...],
    key_finding: "Main insight"
  },
  knowledge_level: "beginner",
  tags: ["visual"],
  arxiv_id: "1234.56789",
  options: {
    generation_mode: "high_quality"
  }
});

if (result.status === 'complete') {
  console.log('Success!', result.final_image_url);
}
```

## Troubleshooting

### Error: FIBO_API_KEY environment variable is required
**Fix:** Create `.env` file with `FIBO_API_KEY=your_key`

### Error: FIBO API error (401): Unauthorized
**Fix:** Your API key is invalid. Get a new one from https://bria.ai

### Generation timeout
**Fix:** FIBO is taking longer than expected. This is normal for complex prompts. Wait up to 2 minutes.

### Text is too small in poster
**Fix:** Shorten your concept explanations to < 150 characters each

## What About FAL?

**FAL is completely optional!** It was included for:
- Layout previews (wireframes before final generation)
- Icon generation (custom icons for metaphors)
- Style variations (dark mode, vibrant, pastel, etc.)

But FIBO alone gives you everything you need for great posters!

If you want to add FAL later, check the `TESTING_GUIDE.md` for full instructions.

## Cost & Performance

**FIBO Generation:**
- Time: 30-60 seconds per poster
- Quality: High (pixel-perfect text, precise layout)
- Cost: Varies by FIBO plan

**Tips for Speed:**
- Fewer concepts = faster generation (3-5 ideal)
- Shorter text = faster processing
- Cache results by arxiv_id + knowledge_level

## Next Steps

1. ✅ Test with example papers
2. ✅ Add your own paper data
3. ⏳ Integrate with friend's system
4. ⏳ Build frontend UI for display
5. ⏳ Add download/share features
6. ⏳ Deploy to production

## Documentation

- **This Guide:** QUICKSTART.md (you are here)
- **Full Testing:** TESTING_GUIDE.md
- **Architecture:** docs/poster-generation-architecture.md
- **Integration:** docs/INTEGRATION_GUIDE.md

---

**Ready?** Run `bun run test-connection.ts` to start!
