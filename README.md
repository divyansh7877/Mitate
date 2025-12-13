# Mitate - Research Poster Generation Pipeline

Production-ready system that converts research paper summaries into professional infographic posters.

## Quick Overview

**Input:** Natural language summary + user details (knowledge level, tags, etc.)
**Output:** Professional poster PNG

### Pipeline
```
Summary + Metadata → LLM Compiler → Layout Engine → FIBO API → Poster Image
```

## Setup (2 minutes)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add API keys
DIGITALOCEAN_API_KEY=your_model_access_key  # For LLM (Llama 3.3 70B)
FIBO_API_KEY=your_bria_api_key              # For poster generation
```

**Get Keys:**
- DigitalOcean: https://cloud.digitalocean.com/account/api/tokens (MODEL ACCESS KEY)
- Bria AI: https://bria.ai (API KEY)

## Basic Usage

```typescript
import { createLLMService } from "./src/services/llmService";
import { createSummaryCompiler } from "./src/services/summaryCompiler";
import { createPosterGenerationOrchestrator } from "./src/services/posterGenerationOrchestratorWithSaving";
import { createFiboService } from "./src/services/fiboService";
import { createOutputSaver } from "./src/utils/outputSaver";

async function generatePoster(summaryText: string, userDetails: {
  knowledgeLevel: "beginner" | "intermediate" | "advanced",
  tags: string[],
  arxivId?: string
}) {
  // Step 1: Compile summary to structured config
  const llm = createLLMService();
  const compiler = createSummaryCompiler(llm, { twoPassMode: true });

  const compiled = await compiler.compile(summaryText, {
    arxivId: userDetails.arxivId || "auto",
    knowledgeLevel: userDetails.knowledgeLevel,
    tags: userDetails.tags
  });

  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.errors}`);
  }

  // Step 2: Generate poster from config
  const fibo = createFiboService();
  const saver = createOutputSaver();
  const orchestrator = createPosterGenerationOrchestrator(fibo, saver);

  const poster = await orchestrator.generate(compiled.data);

  return {
    imageUrl: poster.final_image_url,
    localPath: poster.metadata.output_path
  };
}

// Example usage
const result = await generatePoster(
  "CLIP learns to connect images and text using contrastive learning...",
  {
    knowledgeLevel: "intermediate",
    tags: ["machine-learning", "vision"]
  }
);

console.log("Poster saved to:", result.localPath);
```

## Integration for Other Systems

If you're building a system that only provides summary + user details:

```typescript
import { generatePoster } from "./mitate-integration";

// Your system's output
const userSummary = "Your research summary here...";
const userPreferences = {
  knowledgeLevel: "beginner",  // beginner | intermediate | advanced
  tags: ["ai", "nlp"],
  arxivId: "2024.12345"        // optional
};

// Generate poster
const poster = await generatePoster(userSummary, userPreferences);

// Use the result
console.log("Generated poster:", poster.imageUrl);
console.log("Saved locally at:", poster.localPath);
```

## Key Features

### Knowledge Levels
- **Beginner** - Simple, colorful, visual metaphors, minimal text
- **Intermediate** - Professional, balanced, technical but accessible
- **Advanced** - Academic, dense, mathematical notation, journal-style

### Compilation Modes
- **Single-pass** (75-85% success) - Direct compilation
- **Two-pass** (90-95% success) - Semantic extraction → compilation [Recommended]

### Layout Strategies
- **Vertical Flow** - Sequential concepts (beginner)
- **Grid** - 2-4 concepts side-by-side (intermediate)
- **F-Pattern** - 5+ concepts, efficient reading (intermediate)
- **Academic** - Dense, multi-column (advanced)

### Output Saving
All executions save complete traceability data:
```
output/
├── poster_TIMESTAMP.png                    # Final poster
└── requests/req_TIMESTAMP/                 # Full execution trace
    ├── 1-input/                           # Raw inputs
    ├── 2-compilation/                     # LLM prompts/responses
    ├── 3-layout/                          # Layout decisions
    ├── 4-prompt/                          # FIBO prompt components
    ├── 5-generation/                      # API calls
    ├── 6-final/                           # Metadata
    └── EXECUTION_REPORT.md                # Human-readable report
```

## Core Services

| Service | Purpose | File |
|---------|---------|------|
| LLM Service | Multi-provider LLM interface | [llmService.ts](src/services/llmService.ts) |
| Summary Compiler | Text → Structured config | [summaryCompilerWithSaving.ts](src/services/summaryCompilerWithSaving.ts) |
| Poster Orchestrator | Config → Poster image | [posterGenerationOrchestratorWithSaving.ts](src/services/posterGenerationOrchestratorWithSaving.ts) |
| Output Saver | Complete traceability | [outputSaver.ts](src/utils/outputSaver.ts) |

## Schema

Input is validated using Zod schemas ([generationInput.schema.ts](src/schemas/generationInput.schema.ts)):

```typescript
{
  summary: {
    title: string,
    one_liner: string,
    key_concepts: Array<{
      name: string,
      explanation: string,
      visual_metaphor: string
    }>,
    key_finding: string,
    real_world_impact: string
  },
  knowledge_level: "beginner" | "intermediate" | "advanced",
  tags: string[],
  arxiv_id: string,
  user_preferences?: {
    background?: string,
    preferred_colors?: string[],
    style_preference?: "minimalist" | "detailed" | "academic",
    style_hints?: string
  }
}
```

## Performance

| Metric | Value |
|--------|-------|
| Compilation | 5-10 seconds |
| Generation | 20-60 seconds |
| Total | 25-70 seconds |
| Success Rate | 90-95% (two-pass) |
| Cost per poster | $0.03-0.08 |

## Architecture

```
┌─────────────────┐
│  Summary Text   │  (Unstructured)
│  + User Details │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  LLM Compiler (Llama 3.3 70B)      │
│  • Two-pass semantic extraction     │
│  • Zod validation with retry        │
│  • Auto-generate TypeScript config  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Structured Config (GenerationInput)│
│  • Title, concepts, findings        │
│  • Knowledge level, tags            │
│  • Visual metaphors, aesthetics     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Layout Engine                      │
│  • Analyze concept count            │
│  • Select optimal layout            │
│  • Calculate positioning            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  FIBO Prompt Builder                │
│  • Objects (shapes, images)         │
│  • Text overlays (titles, labels)   │
│  • Aesthetics (colors, spacing)     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Bria AI FIBO v2 API                │
│  • Sync mode generation             │
│  • Professional image synthesis     │
│  • Auto-save PNG                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Poster Image   │  (PNG file)
│  + Trace Data   │
└─────────────────┘
```

## Environment Variables

```bash
# Required
DIGITALOCEAN_API_KEY=xxx    # LLM compilation (MODEL ACCESS KEY)
FIBO_API_KEY=xxx            # Poster generation (Bria AI)

# Optional (fallbacks)
OPENAI_API_KEY=xxx          # Alternative LLM
ANTHROPIC_API_KEY=xxx       # Alternative LLM

# Optional (FAL for alternative generation - currently unused)
FAL_KEY=xxx
```

## Examples

See [compilerExample.ts](src/examples/compilerExample.ts) for:
1. Basic single-pass compilation
2. Two-pass compilation (recommended)
3. Full end-to-end pipeline
4. Batch processing
5. Self-test

## Troubleshooting

### "No LLM API key found"
Add `DIGITALOCEAN_API_KEY` to `.env` (MODEL ACCESS KEY, not regular token)

### "FIBO API error: 403"
Add `FIBO_API_KEY` to `.env` (Bria AI API key)

### Compilation validation fails
Use two-pass mode: `twoPassMode: true` in compiler options

### Need to debug?
All execution data is saved in `output/requests/req_*/`. Check:
- `2-compilation/` for LLM prompts/responses
- `4-prompt/` for FIBO prompt components
- `EXECUTION_REPORT.md` for summary

## Documentation

- **[START_HERE.md](START_HERE.md)** - Complete guide with examples and troubleshooting