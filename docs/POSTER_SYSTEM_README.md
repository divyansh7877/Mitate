# Poster Generation System

> Transform research paper summaries into visually compelling, knowledge-level-aware infographics using FIBO (Bria AI) and FAL AI.

## Overview

This system is your half of the hackathon project. It takes the summarized research paper data from your friend's system and generates beautiful, educational posters/slides that adapt to the user's expertise level.

### Key Features

- **Knowledge-Level Adaptation:** Automatically adjusts visual style, layout complexity, and language based on beginner/intermediate/advanced levels
- **FIBO Structured Prompts:** Maximum control over text rendering, object placement, colors, and composition
- **FAL Integration:** Rapid prototyping, icon generation, and style variations
- **Smart Layout Engine:** Calculates optimal layouts based on content complexity
- **Multi-Stage Pipeline:** Layout preview → Final generation → Style variations

## Project Structure

```
src/
├── types/
│   └── poster.ts                          # TypeScript types for the entire system
├── services/
│   ├── fiboService.ts                     # FIBO API integration
│   ├── falService.ts                      # FAL AI integration
│   ├── layoutEngine.ts                    # Dynamic layout calculation
│   ├── fiboPromptBuilder.ts               # Structured prompt generation
│   └── posterGenerationOrchestrator.ts    # Main orchestrator
├── data/
│   └── exampleSummaries.ts                # Test data (6 research paper examples)
└── examples/
    └── generatePosterExample.ts           # Usage examples

docs/
├── poster-generation-architecture.md      # Full system architecture
├── INTEGRATION_GUIDE.md                   # Integration instructions
└── POSTER_SYSTEM_README.md                # This file
```

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

This will install `@fal-ai/serverless-client` along with all other dependencies.

### 2. Set Up API Keys

Create `.env` file:

```env
FIBO_API_KEY=your_fibo_api_key
FAL_KEY=your_fal_api_key
```

Get your API keys:
- **FIBO (Bria AI):** https://fibo.ai (for Digital Ocean + FIBO hackathon)
- **FAL AI:** https://fal.ai (for FIBO + FAL hackathon)

### 3. Test the System

```typescript
import { createFiboService, createFalService } from './services';
import { createPosterGenerationOrchestrator } from './services/posterGenerationOrchestrator';
import { transformerPaperBeginner } from './data/exampleSummaries';

const fiboService = createFiboService();
const falService = createFalService();
const orchestrator = createPosterGenerationOrchestrator(fiboService, falService);

const result = await orchestrator.generate(transformerPaperBeginner);
console.log(result.final_image_url);
```

## How It Works

### 1. Input Format (From Your Friend's System)

```typescript
{
  summary: {
    title: "Attention Is All You Need",
    one_liner: "A new way to help computers understand language...",
    key_concepts: [
      {
        name: "Self-Attention",
        explanation: "...",
        visual_metaphor: "spotlight on stage" // Key for good visuals!
      }
    ],
    key_finding: "Transformers outperform previous models..."
  },
  knowledge_level: "beginner", // or "intermediate" or "advanced"
  user_preferences: {
    background: "biology",
    preferred_colors: ["blue", "green"]
  },
  tags: ["visual", "conceptual"],
  arxiv_id: "1706.03762"
}
```

### 2. Processing Pipeline

```
Input → Layout Engine → FIBO Prompt Builder → FIBO API → Final Poster
           ↓                                      ↑
      FAL (Icons)                            FAL (Variations)
```

**Stage 1: Layout Calculation**
- Analyzes number of concepts and knowledge level
- Chooses optimal layout: vertical_flow, grid, f_pattern, or academic
- Calculates section positions and sizes

**Stage 2: FIBO Structured Prompt Generation**
- Generates detailed object descriptions for each section
- Creates text elements with precise positioning
- Selects colors, fonts, and styles based on knowledge level
- Adds visual metaphors and diagrams

**Stage 3: FIBO Generation**
- Sends structured prompt to FIBO API
- Waits for high-quality poster generation (30-60s)
- Returns image URL

**Stage 4: Optional Enhancements**
- FAL generates style variations (vibrant, dark mode, pastel, etc.)
- Creates multiple color schemes for user choice

### 3. Output

```typescript
{
  request_id: "gen_123abc",
  status: "complete",
  final_image_url: "https://fibo.ai/generated/poster.png",
  variations: [
    { name: "Vibrant", url: "..." },
    { name: "Dark Mode", url: "..." }
  ],
  metadata: {
    generation_time_ms: 45000,
    fibo_seed: 42857,
    knowledge_level: "beginner"
  }
}
```

## Knowledge Level Examples

### Beginner (ELI5)
- **Visual Style:** Friendly, colorful, with simple illustrations
- **Layout:** Vertical flow, easy to follow
- **Language:** No jargon, uses analogies
- **Colors:** Bright blues (#4299E1), greens (#48BB78), oranges (#ED8936)
- **Example:** "spotlight that shines on multiple actors" for attention mechanism

### Intermediate (Engineer)
- **Visual Style:** Professional with technical diagrams
- **Layout:** Grid or F-pattern for comparison
- **Language:** Technical but accessible
- **Colors:** Professional blues (#2C5282), teals (#2C7A7B)
- **Example:** "Attention(Q,K,V) = softmax(QK^T/√d_k)V" with diagram

### Advanced (Researcher)
- **Visual Style:** Academic with mathematical notation
- **Layout:** Dense multi-column, maximized information
- **Language:** Full technical vocabulary
- **Colors:** Muted academic (#1A365D), grays (#2D3748)
- **Example:** Complete equations, ablation studies, architectural diagrams

## FIBO Maximization Strategy

We maximize FIBO's control features by:

1. **Dynamic Object Generation:** 10-50 objects per poster generated programmatically
2. **Precise Text Rendering:** All text positioned with pixel-perfect accuracy
3. **Knowledge-Level Styling:** Different color schemes, fonts, and layouts per level
4. **Visual Metaphor Integration:** Each concept gets custom visual representation
5. **Compositional Control:** Layouts calculated mathematically for optimal readability

### Example Structured Prompt Snippet

```json
{
  "objects": [
    {
      "description": "Header banner with title and brain-lightbulb icon",
      "location": "top-center, 0% from top",
      "shape_and_color": "Gradient from #4299E1 to #9F7AEA",
      "relative_size": "15% of vertical space"
    }
  ],
  "text_render": [
    {
      "text": "ATTENTION IS ALL YOU NEED",
      "location": "top header, 8% from top",
      "size": "48px equivalent",
      "color": "#FFFFFF",
      "font": "bold sans-serif",
      "appearance_details": "Letter-spacing: 0.05em, high contrast"
    }
  ]
}
```

## FAL AI Usage

We use FAL for three purposes:

### 1. Layout Prototyping (Primary)
- Generate 3 wireframe previews in 2-3 seconds
- User can approve layout before expensive FIBO generation
- Uses FAL's SDXL model

### 2. Icon Generation
- Generate custom icons for visual metaphors
- Creates consistent icon sets per paper
- Uses FAL's Fast-SDXL

### 3. Style Variations
- Generate 5 color scheme variations
- Dark mode, vibrant, pastel, high-contrast, gradient
- Uses FAL's Flux image-to-image

## Integration with Your Friend's System

```typescript
// In your API endpoint
export async function POST_generatePoster(request) {
  // Get summary from friend's system
  const { summary, knowledge_level, user_preferences, tags, arxiv_id } =
    await friendSystemAPI.getSummary(request.paperId);

  // Generate poster
  const orchestrator = createPosterGenerationOrchestrator(
    createFiboService(),
    createFalService()
  );

  const result = await orchestrator.generate({
    summary,
    knowledge_level,
    user_preferences,
    tags,
    arxiv_id,
    options: {
      include_variations: true,
      generation_mode: 'high_quality'
    }
  });

  return result;
}
```

## Example Outputs

We've included 6 example summaries in `src/data/exampleSummaries.ts`:

1. **Transformer Paper** (Beginner, Intermediate, Advanced)
2. **ResNet Paper** (Beginner)
3. **GPT Paper** (Intermediate)
4. **Diffusion Models** (Beginner)

Run examples:
```bash
bun run src/examples/generatePosterExample.ts
```

## Cost Optimization

### Caching Strategy
```typescript
// Cache by: arxiv_id + knowledge_level
const cacheKey = `${arxiv_id}_${knowledge_level}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;

const result = await orchestrator.generate(input);
await redis.set(cacheKey, result, { ttl: 86400 }); // 24 hours
```

### Tiered Access
- **Free Tier:** Fast mode only (FAL, 5-10 seconds)
- **Pro Tier:** High-quality mode with variations (FIBO + FAL, 45-60 seconds)

## Troubleshooting

### FIBO API Issues
```
Error: FIBO API error (401)
Solution: Check FIBO_API_KEY in .env
```

### FAL API Issues
```
Error: FAL connection test failed
Solution: Check FAL_KEY in .env
```

### Text Too Long
```
Warning: TextRender X is very long (250 chars)
Solution: Shorten explanations or use advanced level (smaller fonts)
```

## Hackathon Pitch Points

**For FIBO (Bria AI) Hackathon:**
- "We maximized FIBO's structured prompt control with dynamic object generation"
- "Every text element positioned with mathematical precision"
- "Three distinct visual styles adapted to user expertise"

**For FAL Hackathon:**
- "Used FAL for rapid layout prototyping before expensive final generation"
- "Generated custom icons for each paper's visual metaphors"
- "Created 5 style variations per poster for personalization"

**Combined Innovation:**
- "Multi-stage pipeline: FAL for speed + FIBO for control = best of both worlds"
- "Knowledge-level-aware visual generation - same paper, three different designs"

## Next Steps

1. ✅ System implemented and tested
2. ⏳ Get API keys from FIBO and FAL
3. ⏳ Connect to your friend's summarization system
4. ⏳ Build frontend UI for poster display
5. ⏳ Deploy to Digital Ocean App Platform
6. ⏳ Add download/share features

## Documentation

- **Full Architecture:** `docs/poster-generation-architecture.md`
- **Integration Guide:** `docs/INTEGRATION_GUIDE.md`
- **This README:** `docs/POSTER_SYSTEM_README.md`

## Team Division

**Your Friend:** ArXiv search → Paper summarization → Knowledge-level adaptation
**You:** Summary → Visual poster generation → Multi-format export

**Integration Point:** JSON summary format (defined in `src/types/poster.ts`)

---

**Built with:** TypeScript, React, TanStack Start, FIBO (Bria AI), FAL AI, Tailwind CSS

**Hackathons:** Digital Ocean + MLH + Gradient AI, FIBO + Bria AI + FAL
