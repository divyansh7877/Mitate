# ArXiv to Poster Pipeline Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Pipeline Stages](#pipeline-stages)
  - [Stage 1: ArXiv Paper Discovery](#stage-1-arxiv-paper-discovery)
  - [Stage 2: LLM Summarization](#stage-2-llm-summarization)
  - [Stage 3: Summary Compilation](#stage-3-summary-compilation)
  - [Stage 4: Layout Planning](#stage-4-layout-planning)
  - [Stage 5: FIBO Structured Prompt Generation](#stage-5-fibo-structured-prompt-generation)
  - [Stage 6: Image Generation](#stage-6-image-generation-fibobria-ai)
  - [Stage 7: Orchestration & Output](#stage-7-orchestration--output)
- [Frontend Integration](#frontend-integration)
- [Complete Data Flow](#complete-data-flow)
- [Key Files Reference](#key-files-reference)

---

## Overview

**Complete Pipeline**: ArXiv → Poster

```
ArXiv Search → LLM Summary → Compilation → Layout → FIBO Prompt → Image Gen → Result
```

This 7-stage pipeline transforms research papers into educational infographics with knowledge-level adaptation.

**Key Innovation**: Vector text overlays ensure crystal-clear typography, avoiding the blurriness typical of diffusion-generated text in AI image generation.

---

## Pipeline Stages

### Stage 1: ArXiv Paper Discovery

**Location**: `functions/process-generation/src/main.js:85-289`

#### Input Modes

1. **Direct ArXiv ID/URL**
   - Extracts ID from URLs like `arxiv.org/abs/2405.12345`
   - Fetches via `http://export.arxiv.org/api/query?id_list={arxivId}`

2. **Topic Search**
   - Searches via `http://export.arxiv.org/api/query?search_query=all:{topic}`
   - Returns top result

#### Output: Paper Metadata

```json
{
  "arxiv_id": "2405.12345",
  "title": "Paper Title",
  "abstract": "Full abstract text...",
  "authors": ["Author1", "Author2"],
  "published": "2024-05-15",
  "pdf_url": "https://arxiv.org/pdf/2405.12345.pdf",
  "arxiv_url": "https://arxiv.org/abs/2405.12345"
}
```

---

### Stage 2: LLM Summarization

**Files**:
- `src/services/llmService.ts` (LLM provider)
- `functions/process-generation/src/main.js:294-492` (summarization logic)

#### Multi-Provider LLM Service

**Priority order**:
1. **DigitalOcean Gradient** (Llama 3.3 70B) - Primary
2. **OpenAI** (GPT-4) - Fallback 1
3. **Anthropic** (Claude 3.5 Sonnet) - Fallback 2

**Configuration**:
- Temperature: `0.1`
- Max tokens: `8192`

#### Knowledge-Level Adaptive Prompting

The system adapts summarization based on target audience:

| Level | Approach |
|-------|----------|
| **Beginner** | Simple language, analogies, no jargon |
| **Intermediate** | Professional language, balanced technical terms |
| **Advanced** | Full technical vocabulary, methodology details |

#### Output: Structured Summary (JSON)

```json
{
  "one_liner": "Single sentence summary",
  "key_concepts": [
    {
      "name": "Concept Name",
      "explanation": "2-3 sentences",
      "visual_metaphor": "Concrete visual analogy"
    }
    // 3-7 concepts total
  ],
  "key_finding": "Main result (1-2 sentences)",
  "real_world_impact": "Practical applications"
}
```

**Validation**: Ensures 3-7 concepts, all required fields present. Falls back to abstract parsing if LLM fails.

---

### Stage 3: Summary Compilation

**File**: `src/services/summaryCompiler.ts`

#### Purpose

Convert unstructured JSON summary → Strictly typed `GenerationInput` configuration

#### Two-Pass Compilation Mode (Recommended)

**Pass 1: Semantic Extraction** (`promptTemplates.ts:143-175`)
- LLM extracts structured semantic data
- Outputs JSON with title, concepts, findings, audience hints

**Pass 2: Deterministic Compilation** (`promptTemplates.ts:181-200`)
- LLM generates TypeScript code conforming to schema
- Exports constant: `exampleSummary`
- **NO comments, NO markdown, ONLY valid TypeScript**

#### Validation with Retry Logic

```
Attempt → LLM Generate → Extract TS → Parse → Validate
   ↓ FAIL (with error feedback)
Retry → LLM Generate (with errors) → Validate
   ↓ Up to 3 attempts
```

**Schema**: `src/schemas/generationInput.schema.ts` (Zod validation)

#### Output: GenerationInput

```typescript
{
  summary: {
    title: string,
    one_liner: string,
    key_concepts: Concept[] (max 6),
    key_finding: string,
    real_world_impact?: string
  },
  knowledge_level: "beginner" | "intermediate" | "advanced",
  tags: string[],
  arxiv_id: string,
  options?: { generation_mode, seed, etc. }
}
```

---

### Stage 4: Layout Planning

**File**: `src/services/layoutEngine.ts`

#### Dynamic Layout Selection

Based on `knowledge_level` and concept count:

| Audience | Concepts | Layout | Description |
|----------|----------|--------|-------------|
| **Beginner** | Any | `vertical_flow` | Top-to-bottom, easy to follow |
| **Intermediate** | ≤4 | `grid` | 2x2 grid for comparison |
| **Intermediate** | >4 | `f_pattern` | F-shaped eye movement |
| **Advanced** | Any | `academic` | Dense 2-column layout |

#### Output: LayoutStrategy

```typescript
{
  type: "vertical_flow" | "grid" | "f_pattern" | "academic",
  sections: [
    {
      type: "header",
      height_percentage: 15,
      position: { x, y }
    },
    {
      type: "concept",
      height_percentage: 60,
      // ... positioned concept boxes
    },
    {
      type: "footer",
      height_percentage: 10
    }
  ],
  margins: { top, right, bottom, left },
  spacing: number
}
```

---

### Stage 5: FIBO Structured Prompt Generation

**File**: `src/services/fiboPromptBuilder.ts`

#### Critical Innovation: Vector Text Overlays

The system explicitly instructs FIBO to treat text as **vector overlays** rather than diffusion-generated text for maximum clarity.

#### Prompt Components

##### 1. Short Description (Lines 52-75)
- Overview with layout type
- Key instruction: *"Text elements should be treated as vector overlays, NOT diffusion-generated text"*
- Emphasizes *"crystal clear, sharp, fully legible"*

##### 2. Objects Array (Lines 80-148)

Visual elements:
- Header banner with title + level icon
- Concept boxes (1 per `key_concept`)
- Connector lines (for vertical layouts)
- Footer section with key finding

Each object specifies:

```typescript
{
  description: "Visual content description",
  location: "top-center" | "grid-position-1" | etc.,
  relationship: "how it relates to other elements",
  relative_size: "30% width, 15% height",
  shape_and_color: "rounded rectangle, gradient blue",
  texture: "matte finish",
  appearance_details: "subtle shadow for depth",
  orientation: "horizontal"
}
```

##### 3. Color Schemes (Lines 533-565)

| Level | Colors | Background |
|-------|--------|------------|
| **Beginner** | Bright blues/purples/greens | White |
| **Intermediate** | Professional blues/teals/golds | Light gray |
| **Advanced** | Dark academic colors, minimal | Off-white |

##### 4. Typography (Lines 570-614)

| Level | Font Family | Title Size |
|-------|-------------|------------|
| **Beginner** | Poppins/Nunito (friendly) | 48px |
| **Intermediate** | Inter (professional sans-serif) | 44px |
| **Advanced** | Merriweather (serif/condensed) | 40px |

##### 5. Text Render Elements (Lines 291-377) **← CRITICAL**

All text marked as **"OVERLAY TEXT LAYER"**:

| Element | Size | Style | Color |
|---------|------|-------|-------|
| Title | 72pt | Bold, caps | White |
| Subtitle | 24pt | Regular | White |
| Concept headings | 28pt | Bold | High contrast |
| Explanations | 16pt | Regular | Gray |
| Key insight | 20pt | Bold | White |
| Citation | 12pt | Regular | 80% opacity |

Specifications include:
- Exact pt equivalents
- High contrast colors
- Anti-aliasing requirements
- Sharp edges, no blurriness

##### 6. Background (Lines 419-432)
- Level-specific patterns (dots, grids, minimal)
- *"PERFECTLY SMOOTH with no artifacts"*

##### 7. Lighting & Aesthetics (Lines 437-478)
- Flat, even ambient lighting
- Minimal shadows for depth only
- WCAG AA accessibility compliance

##### 8. Artistic Style (Lines 517-528)
- *"SHARP LINES, HIGH RESOLUTION"*
- Beginner: *"minimalist modern infographic"*
- Intermediate: *"professional technical illustration"*
- Advanced: *"ULTRA-SHARP academic diagrams"*

#### Output: FiboStructuredPrompt

```typescript
{
  short_description: string,
  objects: FiboObject[],
  background_setting: string,
  lighting: { /* lighting config */ },
  aesthetics: { /* color schemes, typography */ },
  photographic_characteristics: { /* resolution, quality */ },
  style_medium: "digital illustration, infographic",
  text_render: FiboTextRender[],  // OVERLAY TEXT elements
  context: string,
  artistic_style: string
}
```

---

### Stage 6: Image Generation (FIBO/BRIA AI)

**File**: `src/services/fiboService.ts`

#### API Configuration

- **Endpoint**: `https://engine.prod.bria-api.com/v2/image/generate`
- **Poll timeout**: 5 minutes (150 attempts × 2s)

#### Generation Request

```json
{
  "structured_prompt": "JSON.stringify(fiboStructuredPrompt)",
  "seed": "number",  // For reproducibility
  "image_size": { "width": 1024, "height": 1024 },
  "output_format": "png",
  "sync": true,
  "steps_num": 50,  // MAX quality (45-50 recommended)
  "enhance_image": true,  // Post-processing sharpness
  "guidance_scale": 5,  // Strong prompt adherence
  "aspect_ratio": "1:1",
  "fast": false,  // Quality over speed
  "negative_prompt": "blurry text, illegible labels, distorted fonts, low contrast text, pixelated letters, unreadable text, fuzzy text edges, text artifacts, poor typography, unclear letters, smudged text, compressed text, watermark, low quality, amateur design, cluttered, messy"
}
```

#### Quality Optimization

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `steps_num` | 50 | Maximum iterations for best quality |
| `enhance_image` | true | Post-processing for sharpness |
| `guidance_scale` | 5 | Strong adherence to structured_prompt |
| `fast` | false | Prioritize quality over speed |
| `negative_prompt` | Extensive | Avoid text rendering issues |

#### Asynchronous Flow

1. POST request returns `status: "PENDING"` + `status_url`
2. Poll every 2 seconds for up to 5 minutes
3. Check status: `COMPLETED`, `FAILED`, or `PROCESSING`
4. On completion: return `{ image_url, generation_time_ms }`

#### Download & Storage

**File**: `src/utils/imageDownloader.ts`

- Downloads generated PNG
- Saves to `output/{requestId}-single.png` (single mode)
- Or `output/{requestId}-modular-{index}.png` (modular mode)

---

### Stage 7: Orchestration & Output

**File**: `src/services/posterGenerationOrchestrator.ts`

#### Main Pipeline Flow

```
GenerationInput
  ↓
1. Calculate Layout (layoutEngine.calculateLayout)
  ↓
2. Build FIBO Prompt (promptBuilder.build + validation)
  ↓
3. Generate Image (fiboService.generatePoster)
  ↓
4. Download & Save (imageDownloader)
  ↓
GenerationOutput
```

#### Two Generation Modes

##### 1. Single Image Mode (`generateSingleImage()`)
- One complete poster with all elements
- 1024×1024 or custom size
- All text rendered as overlays

##### 2. Modular Mode (`generateModular()`)
- Separate sections generated independently:
  - **Header**: 1600×300
  - **Concept sections**: 1600×400 each
  - **Footer**: 1600×200
- **Benefits**: Better text quality, less crowding, easier composition

#### Output: GenerationOutput

```typescript
{
  request_id: string,
  status: "complete" | "pending" | "generating_layout" | "generating_final" | "failed",
  final_image_url?: string,
  metadata: {
    generation_time_ms: number,
    fibo_seed: number,
    fibo_prompt: FiboStructuredPrompt,
    knowledge_level: KnowledgeLevel,
    timestamp: string,
    local_path?: string,
    section_urls?: string[],  // For modular
    local_paths?: string[]    // For modular
  },
  error?: string
}
```

---

## Frontend Integration

### App Flow

**Files**: `src/lib/app-context.tsx`, `src/components/LandingPage.tsx`

1. **Landing Page**: User inputs query + knowledge level
2. **API Call**: `api.generate()` submits to Appwrite function
3. **Loading State**: Polls `api.getStatus(requestId)` for updates
4. **Result Page**: Displays final poster + summary + ArXiv link

### Status Updates

| Status | Description |
|--------|-------------|
| `finding_paper` | Searching ArXiv |
| `summarizing` | LLM processing abstract |
| `generating_image` | FIBO creating poster |
| `complete` | Display result |

---

## Complete Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ USER INPUT                                                   │
│ • Query: "transformers" or "arxiv.org/abs/1706.03762"       │
│ • Knowledge Level: beginner/intermediate/advanced           │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │ Appwrite Function     │
              │ (process-generation)  │
              └───────────┬───────────┘
                          │
         ┌────────────────┼────────────────┬──────────────┐
         ↓                ↓                ↓              ↓
    ┌─────────┐    ┌───────────┐   ┌──────────┐   ┌──────────┐
    │ ArXiv   │    │ Gradient  │   │ Compiler │   │ FIBO     │
    │ API     │    │ AI (LLM)  │   │ LLM      │   │ (Bria)   │
    └────┬────┘    └─────┬─────┘   └────┬─────┘   └────┬─────┘
         │               │              │              │
         ↓               ↓              ↓              ↓
    Paper Metadata   JSON Summary   TypeScript    PNG Image
    (title,          (5-7 concepts,  Config        (1024×1024)
     abstract,       findings,       (validated
     authors,        metaphors)      GenerationInput)
     URLs)
         │               │              │              │
         └───────────────┴──────────────┴──────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │ Database Storage      │
              │ (Appwrite)            │
              └───────────┬───────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │ Frontend Result Page  │
              │ • Poster display      │
              │ • Summary JSON        │
              │ • ArXiv link          │
              └───────────────────────┘
```

---

## Key Files Reference

| Component | File | Lines |
|-----------|------|-------|
| **ArXiv Integration** | `functions/process-generation/src/main.js` | 85-289 |
| **LLM Summarization** | `src/services/llmService.ts` | 58-102 |
| **Summary Prompts** | `functions/process-generation/src/main.js` | 294-492 |
| **Compilation** | `src/services/summaryCompiler.ts` | 79-261 |
| **Prompt Templates** | `src/services/promptTemplates.ts` | 1-200 |
| **Schema Validation** | `src/schemas/generationInput.schema.ts` | Full file |
| **Layout Engine** | `src/services/layoutEngine.ts` | Full file |
| **FIBO Prompt Builder** | `src/services/fiboPromptBuilder.ts` | Full file |
| **FIBO Service** | `src/services/fiboService.ts` | 51-181 |
| **Orchestrator** | `src/services/posterGenerationOrchestrator.ts` | 35-294 |

---

## Summary

This pipeline transforms research papers into educational infographics through **7 intelligent stages**:

1. **ArXiv Discovery**: Search or direct fetch of paper metadata
2. **LLM Summarization**: Knowledge-level adapted summaries with visual metaphors
3. **Deterministic Compilation**: Type-safe configuration generation with validation
4. **Smart Layout**: Audience-appropriate visual organization
5. **FIBO Prompt Generation**: Structured prompts with vector text overlays
6. **Professional Image Generation**: BRIA AI's FIBO with quality optimization
7. **Orchestration & Storage**: Complete pipeline with modular support

**Key Innovation**: Vector text overlays ensure crystal-clear typography, avoiding the blurriness typical of diffusion-generated text in AI image generation.
