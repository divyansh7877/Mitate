# Mitate - AI-Powered Research Paper Visual Explainer

Transform complex research papers into beautiful, educational infographics tailored to your knowledge level.

## Overview

Mitate takes arXiv research papers and automatically generates professional visual explainers using AI-powered summarization and image generation. The system adapts content complexity to beginner, intermediate, or advanced knowledge levels.

## Architecture

### Tech Stack
- **Frontend**: React + TanStack Router (SPA)
- **Backend**: Appwrite Functions (Serverless)
- **Database**: Appwrite Database
- **Storage**: Appwrite Storage
- **AI Services**:
  - DigitalOcean Gradient AI (llama3.3-70b-instruct) - Summarization
  - FIBO/Bria AI - Image Generation

### System Flow

```
User Input (topic or arXiv URL)
    ↓
generate-poster function (Entry Point)
    ↓
process-generation function (Worker)
    ↓
1. ArXiv Paper Discovery
2. AI Summarization (DigitalOcean Gradient)
3. FIBO Image Generation
    ↓
Result stored in Database
```

## Appwrite Functions

### 1. generate-poster (`generate-poster-func`)
- **Path**: `functions/generate/`
- **Purpose**: Entry point API for user requests
- **Endpoints**:
  - `POST /` - Create generation request
  - `GET /?requestId=xxx` - Check request status
- **Triggers**: `process-generation` worker function

### 2. process-generation (`693db15f0009c3b28c94`)
- **Path**: `functions/process-generation/`
- **Purpose**: Background worker for AI processing
- **Specification**: 1vCPU, 1GB RAM (upgraded for AI workloads)
- **Process**:
  1. Fetches paper metadata from arXiv API
  2. Calls DigitalOcean Gradient AI for summarization
  3. Generates structured prompt for FIBO
  4. Calls FIBO API to create infographic
  5. Stores result in database

## Database Schema

### `requests` Collection
Tracks generation requests and their status.

**Fields**:
- `query` (string) - User search query or arXiv URL
- `query_type` (enum) - "topic" or "arxiv_link"
- `knowledge_level` (enum) - "beginner", "intermediate", "advanced"
- `status` (enum) - "pending", "finding_paper", "summarizing", "generating_image", "complete", "failed"
- `created_at`, `updated_at` (datetime)

### `results` Collection
Stores completed infographics and summaries.

**Fields**:
- `request_id` (string) - Link to request
- `arxiv_id` (string) - ArXiv paper ID
- `paper_title` (string)
- `paper_url` (string)
- `summary_json` (string) - AI-generated summary with key concepts
- `image_url` (string) - FIBO-generated infographic URL
- `fibo_structured_prompt` (string) - Prompt used for generation
- `fibo_seed` (integer) - Seed for reproducibility

### `poster_generations` Collection
Extended metadata for poster generation process (optional/future use).

## Environment Variables

### process-generation function
```
APPWRITE_API_KEY=<api_key>
DATABASE_ID=mitate-db
BUCKET_ID=poster-images
FIBO_API_KEY=<fibo_key>
DO_GRADIENT_API_KEY=<digitalocean_key>
DO_GRADIENT_MODEL=llama3.3-70b-instruct
```

### generate-poster function
```
APPWRITE_API_KEY=<api_key>
DATABASE_ID=mitate-db
WORKER_FUNCTION_ID=693db15f0009c3b28c94
FIBO_API_KEY=<fibo_key>
DO_GRADIENT_API_KEY=<digitalocean_key>
```

### Frontend (for deployment)
```
VITE_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=693d8dcf002f5a572b12
VITE_APPWRITE_FUNCTION_GENERATE_ID=generate-poster-func
```

## API Integration Details

### ArXiv API
- **Endpoint**: `http://export.arxiv.org/api/query`
- **Purpose**: Paper discovery and metadata extraction
- **No Auth Required**

### DigitalOcean Gradient AI
- **Endpoint**: `https://inference.do-ai.run/v1/chat/completions`
- **Model**: `llama3.3-70b-instruct`
- **Purpose**: Generate knowledge-level-appropriate summaries
- **Output**: Structured JSON with key concepts, visual metaphors, and findings

### FIBO/Bria AI
- **Endpoint**: `https://engine.prod.bria-api.com/v2/image/generate`
- **Purpose**: Generate professional infographic images
- **Input**: Structured prompt with objects, text layers, aesthetics
- **Output**: High-resolution PNG infographic (1024x1024)

## AI Summary Structure

The DigitalOcean AI generates summaries with:

```json
{
  "title": "Paper title",
  "one_liner": "Brief summary",
  "key_concepts": [
    {
      "name": "Concept name",
      "explanation": "Level-appropriate explanation",
      "visual_metaphor": "Concrete visual analogy for image generation"
    }
  ],
  "key_finding": "Main result",
  "real_world_impact": "Practical applications"
}
```

## FIBO Structured Prompt

The system generates detailed prompts with:
- **Layout**: Vertical flow with header, concept sections, footer
- **Color Schemes**: Knowledge-level specific (bright for beginners, professional for intermediate, academic for advanced)
- **Objects**: Visual representations of concepts with metaphors
- **Text Layers**: Overlay text rendered separately for clarity
- **Aesthetics**: Professional composition with high aesthetic scores

## Deployment

### Functions
```bash
npx appwrite push functions --all
```

### Frontend
Build output: `dist/`

Deploy to:
- Appwrite Static Sites (via Console UI)
- Vercel (recommended): `vercel deploy`
- Any static hosting platform

## Development

### Local Development
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

### Testing Functions Locally
```bash
# Navigate to function directory
cd functions/process-generation

# Install dependencies
npm install

# Test locally (requires Appwrite CLI setup)
```

## Project Structure

```
mitate/
├── src/                           # Frontend React app
│   ├── components/               # UI components
│   ├── lib/                      # Appwrite client, API, types
│   ├── routes/                   # TanStack Router routes
│   └── experimental-prompts/     # Experimental prompt engineering code (see below)
├── functions/
│   ├── generate/                 # Entry point function
│   └── process-generation/       # Worker function
├── docs/                         # Documentation
├── appwrite.config.json          # Appwrite project configuration
└── package.json
```

### Experimental Prompts Directory

The `src/experimental-prompts/` directory contains experimental code from our initial prompt engineering research phase. This code was used to develop and test the optimal FIBO structured prompts, layout strategies, and AI summarization formats that are now integrated into the production `functions/process-generation/` worker.

**Contents:**
- `data/` - Example research paper summaries used for testing
- `examples/` - Standalone test scripts for compiler and generation workflows
- `schemas/` - Zod validation schemas for generation input
- `services/` - Service implementations:
  - `llmService.ts` - LLM integration (DigitalOcean, OpenAI, Anthropic)
  - `summaryCompiler.ts` - Text-to-structured-config compilation
  - `fiboPromptBuilder.ts` - FIBO structured prompt generation
  - `layoutEngine.ts` - Layout calculation and color scheme selection
  - `posterGenerationOrchestrator.ts` - End-to-end generation orchestration
- `types/` - TypeScript type definitions
- `utils/` - Utility functions (image downloading, output saving)

**Purpose:**
This code was instrumental in:
1. Discovering optimal FIBO prompt structures (text overlays, layout strategies)
2. Testing different knowledge-level adaptations (beginner/intermediate/advanced)
3. Iterating on AI summarization prompts for DigitalOcean Gradient
4. Validating the complete pipeline before serverless deployment

**Current Status:**
The learnings and patterns from this experimental code have been integrated into `functions/process-generation/src/main.js`. This directory is preserved for reference and potential future experimentation but is **not used in production**.

## Status: Production Ready ✅

- ✅ ArXiv paper discovery working
- ✅ DigitalOcean AI summarization working
- ✅ FIBO image generation working
- ✅ Database schema deployed
- ✅ Functions deployed and tested
- ✅ Frontend built and ready to deploy

## Future Enhancements

- User authentication and history
- Multiple infographic styles/layouts
- PDF export
- Social media sharing
- Batch processing
- Custom branding options
