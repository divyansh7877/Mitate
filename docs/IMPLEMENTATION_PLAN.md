# Implementation Plan: Gradient AI Integration & Backend Functions

**Created:** 2025-12-13  
**Branch:** feature/combined-features  
**Status:** Ready for Implementation

---

## Overview

This document outlines the implementation plan to complete the ArXiv Visual Explainer system by:
1. Implementing Gradient AI summarization
2. Creating Appwrite Functions for backend processing
3. Connecting frontend to real backend APIs
4. Configuring environment variables

---

## Current System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (React + Vite + TanStack Router)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LandingPage.tsx                                            │
│  ├─ User Input: query + knowledge_level                     │
│  └─ Calls: api.generate(request) [CURRENTLY MOCKED]         │
│                                                             │
│  LoadingState.tsx                                           │
│  ├─ Shows: 3-step progress UI                               │
│  └─ Polls: api.getStatus(request_id) [CURRENTLY MOCKED]     │
│                                                             │
│  ResultPage.tsx                                             │
│  ├─ Displays: image + paper metadata + summary              │
│  └─ Actions: download PNG, try another topic                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓ ↑
                    [NEEDS IMPLEMENTATION]
                           ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│ APPWRITE FUNCTIONS (Backend Workers)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Function 1: generate-poster                                │
│  ├─ POST /api/generate                                      │
│  ├─ Creates request in database                             │
│  ├─ Triggers background processing                          │
│  └─ Returns: { request_id, status: "pending" }              │
│                                                             │
│  Function 2: get-generation-status                          │
│  ├─ GET /api/status/:requestId                              │
│  ├─ Queries database for request status                     │
│  └─ Returns: { status, result?, error? }                    │
│                                                             │
│  Background Worker: process-generation [TO IMPLEMENT]       │
│  ├─ Agent 1: Paper Finder (ArXiv API)                       │
│  ├─ Agent 2: Summarizer (Gradient AI) [TO IMPLEMENT]        │
│  ├─ Agent 3: Image Generator (FIBO + FAL)                   │
│  └─ Updates database with results                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL SERVICES                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ ArXiv API (http://export.arxiv.org/api/query)            │
│  ✗ Gradient AI (LLM summarization) [TO IMPLEMENT]           │
│  ✓ FIBO API (Bria AI image generation)                      │
│  ✓ FAL.AI (Quick variations & icons)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│ APPWRITE DATABASE                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Collection: requests                                       │
│  ├─ query, query_type, knowledge_level                      │
│  ├─ status, created_at, updated_at                          │
│                                                             │
│  Collection: results                                        │
│  ├─ request_id, arxiv_id, paper_title                       │
│  ├─ summary_json, fibo_structured_prompt                    │
│  ├─ image_url, image_storage_id                             │
│                                                             │
│  Collection: poster_generations                             │
│  ├─ request_id, status, input_summary                       │
│  ├─ fibo_seed, final_image_url                              │
│                                                             │
│  Storage Bucket: poster-images                              │
│  └─ Stores generated PNG files                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Environment & Dependencies Setup

#### Task 1.1: Install Required Dependencies
**Location:** Root project directory

```bash
# Gradient AI SDK
npm install @gradient-ai/nodejs-sdk

# Appwrite Server SDK (for Functions)
cd functions/generate-poster
npm install node-appwrite

cd ../get-generation-status  
npm install node-appwrite

cd ../process-generation
npm install node-appwrite @gradient-ai/nodejs-sdk axios
```

#### Task 1.2: Configure Environment Variables
**Location:** `.env` and Appwrite Function environments

**Root `.env` file:**
```bash
# Existing Appwrite Config
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=mitate-db
VITE_APPWRITE_BUCKET_ID=poster-images

# Appwrite Functions (get these after creating functions)
VITE_APPWRITE_FUNCTION_GENERATE_ID=function_id_here
VITE_APPWRITE_FUNCTION_STATUS_ID=function_id_here

# External Services (already configured)
FIBO_API_KEY=your_fibo_key
FAL_KEY=your_fal_key

# New: Gradient AI
GRADIENT_ACCESS_TOKEN=your_gradient_token
GRADIENT_WORKSPACE_ID=your_gradient_workspace_id
```

**Appwrite Function Environment Variables:**
(Configure in Appwrite Console for each function)
```
APPWRITE_FUNCTION_PROJECT_ID
APPWRITE_API_KEY
GRADIENT_ACCESS_TOKEN
GRADIENT_WORKSPACE_ID
FIBO_API_KEY
FAL_KEY
DATABASE_ID=mitate-db
BUCKET_ID=poster-images
```

---

### Phase 2: Appwrite Functions Implementation

#### Task 2.1: Create `generate-poster` Function
**Location:** `functions/generate-poster/src/main.js`

**Purpose:** Initiates poster generation process

**Endpoints:**
- `POST /` - Create new generation request

**Input:**
```json
{
  "query": "transformer architecture" | "https://arxiv.org/abs/1706.03762",
  "knowledge_level": "beginner" | "intermediate" | "advanced"
}
```

**Output:**
```json
{
  "request_id": "abc123",
  "status": "pending",
  "message": "Your visual explainer is being generated"
}
```

**Implementation Steps:**
1. Parse and validate request body
2. Determine query_type (topic vs arxiv_link)
3. Create document in `requests` collection with status="pending"
4. Trigger `process-generation` function asynchronously
5. Return request_id to client

**File Structure:**
```
functions/generate-poster/
├── package.json
├── src/
│   └── main.js
└── .env (local development only)
```

---

#### Task 2.2: Create `get-generation-status` Function
**Location:** `functions/get-generation-status/src/main.js`

**Purpose:** Returns current status of a generation request

**Endpoints:**
- `GET /?requestId=xxx` - Query request status

**Input (Query Param):**
```
requestId=abc123
```

**Output (Pending):**
```json
{
  "request_id": "abc123",
  "status": "summarizing",
  "message": "Summarizing paper with AI..."
}
```

**Output (Complete):**
```json
{
  "request_id": "abc123",
  "status": "complete",
  "result": {
    "paper_title": "Attention Is All You Need",
    "paper_url": "https://arxiv.org/abs/1706.03762",
    "image_url": "https://cloud.appwrite.io/v1/storage/buckets/poster-images/files/xyz/view",
    "summary": {
      "title": "...",
      "one_liner": "...",
      "key_concepts": [...],
      "key_finding": "...",
      "real_world_impact": "..."
    }
  }
}
```

**Implementation Steps:**
1. Parse requestId from query parameters
2. Query `requests` collection for document
3. If status="complete", join with `results` collection
4. If status="failed", return error message
5. Return current status and data

**File Structure:**
```
functions/get-generation-status/
├── package.json
├── src/
│   └── main.js
└── .env (local development only)
```

---

#### Task 2.3: Create `process-generation` Function (Main Worker)
**Location:** `functions/process-generation/src/main.js`

**Purpose:** Background worker that orchestrates the entire generation pipeline

**Triggered By:** `generate-poster` function (async execution)

**Processing Pipeline:**

```javascript
// STAGE 1: Find Paper (Agent 1)
status = "finding_paper"
├─ If query_type === "arxiv_link"
│  └─ Extract arxiv_id from URL
├─ If query_type === "topic"
│  └─ Search ArXiv API with query
└─ Fetch paper metadata (title, abstract, authors, pdf_url)

// STAGE 2: Summarize Paper (Agent 2) [GRADIENT AI]
status = "summarizing"
├─ Input: abstract + knowledge_level
├─ Call Gradient AI with structured prompt
├─ Parse response into Summary JSON
├─ Validate summary structure
└─ Store summary in database

// STAGE 3: Generate Image (Agent 3)
status = "generating_image"
├─ Instantiate PosterGenerationOrchestrator
├─ Build GenerationInput from summary
├─ Call orchestrator.generate(input)
│  ├─ LayoutEngine calculates layout
│  ├─ FiboPromptBuilder creates structured prompt
│  ├─ FiboService generates image
│  └─ Optional: FAL variations
├─ Upload image to Appwrite Storage
└─ Store result in database

// STAGE 4: Complete
status = "complete"
├─ Update requests collection
├─ Create result document
└─ Store final image_url
```

**Implementation Steps:**

1. **Setup & Initialization**
   ```javascript
   import { Client, Databases, Storage } from 'node-appwrite';
   import Gradient from '@gradient-ai/nodejs-sdk';
   import { createPosterGenerationOrchestrator } from './orchestrator.js';
   import { FiboService } from './services/fiboService.js';
   import { FalService } from './services/falService.js';
   ```

2. **Agent 1: Paper Finder**
   ```javascript
   async function findPaper(query, queryType) {
     if (queryType === 'arxiv_link') {
       const arxivId = extractArxivId(query);
       return await fetchPaperMetadata(arxivId);
     } else {
       return await searchArxiv(query);
     }
   }
   
   async function fetchPaperMetadata(arxivId) {
     const response = await axios.get(
       `http://export.arxiv.org/api/query?id_list=${arxivId}`
     );
     // Parse XML response
     return {
       arxiv_id,
       title,
       abstract,
       authors,
       published,
       pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`
     };
   }
   ```

3. **Agent 2: Gradient AI Summarizer** [NEW IMPLEMENTATION]
   ```javascript
   async function summarizeWithGradientAI(abstract, knowledgeLevel) {
     const gradient = new Gradient({
       accessToken: process.env.GRADIENT_ACCESS_TOKEN,
       workspaceId: process.env.GRADIENT_WORKSPACE_ID
     });
     
     const prompt = buildSummarizationPrompt(abstract, knowledgeLevel);
     
     const response = await gradient.chat.completions.create({
       model: 'llama-3-70b-instruct',
       messages: [
         {
           role: 'system',
           content: 'You are an expert at summarizing research papers for different knowledge levels.'
         },
         {
           role: 'user',
           content: prompt
         }
       ],
       temperature: 0.7,
       maxTokens: 2000
     });
     
     const summaryJSON = JSON.parse(response.choices[0].message.content);
     return validateSummary(summaryJSON);
   }
   ```

4. **Agent 3: Image Generation**
   ```javascript
   async function generatePoster(summary, knowledgeLevel, arxivId) {
     const fiboService = new FiboService(process.env.FIBO_API_KEY);
     const falService = new FalService(process.env.FAL_KEY);
     const orchestrator = createPosterGenerationOrchestrator(
       fiboService,
       falService
     );
     
     const generationInput = {
       summary,
       knowledge_level: knowledgeLevel,
       arxiv_id: arxivId,
       tags: ['educational'],
       options: {
         include_variations: false,
         generation_mode: 'high_quality'
       }
     };
     
     const result = await orchestrator.generate(generationInput);
     
     if (result.status === 'failed') {
       throw new Error(result.error);
     }
     
     return result;
   }
   ```

5. **Storage & Database Updates**
   ```javascript
   async function uploadToStorage(imageUrl, requestId) {
     const response = await fetch(imageUrl);
     const buffer = await response.arrayBuffer();
     
     const file = await storage.createFile(
       process.env.BUCKET_ID,
       ID.unique(),
       InputFile.fromBuffer(buffer, `${requestId}.png`)
     );
     
     return file.$id;
   }
   
   async function storeResult(databases, requestId, data) {
     await databases.createDocument(
       process.env.DATABASE_ID,
       'results',
       ID.unique(),
       {
         request_id: requestId,
         arxiv_id: data.arxiv_id,
         paper_title: data.paper_title,
         paper_url: data.paper_url,
         summary_json: JSON.stringify(data.summary),
         fibo_structured_prompt: JSON.stringify(data.fibo_prompt),
         fibo_seed: data.fibo_seed,
         image_url: data.image_url,
         image_storage_id: data.storage_id,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       }
     );
   }
   ```

**File Structure:**
```
functions/process-generation/
├── package.json
├── src/
│   ├── main.js (entry point)
│   ├── agents/
│   │   ├── paperFinder.js
│   │   ├── gradientSummarizer.js
│   │   └── imageGenerator.js
│   ├── services/
│   │   ├── fiboService.js (copy from src/services)
│   │   ├── falService.js
│   │   ├── layoutEngine.js
│   │   └── fiboPromptBuilder.js
│   ├── types/
│   │   └── poster.ts (copy from src/types)
│   └── utils/
│       ├── validation.js
│       └── arxivParser.js
└── .env
```

---

### Phase 3: Gradient AI Integration Details

#### Task 3.1: Design Summarization Prompt
**Location:** `functions/process-generation/src/agents/gradientSummarizer.js`

**Prompt Template:**

```javascript
function buildSummarizationPrompt(abstract, knowledgeLevel) {
  const levelInstructions = {
    beginner: `
      - Use simple, everyday language
      - Explain concepts like you're talking to a 5th grader
      - Use analogies and metaphors from daily life
      - Avoid technical jargon
      - Focus on "what" and "why" rather than "how"
    `,
    intermediate: `
      - Use professional language with some technical terms
      - Define technical terms when first used
      - Balance between accessibility and precision
      - Include practical implications
      - Explain "how" things work at a high level
    `,
    advanced: `
      - Use full technical vocabulary
      - Include methodology details
      - Discuss limitations and nuances
      - Reference related work
      - Focus on theoretical foundations and implications
    `
  };
  
  return `
You are summarizing a research paper for a ${knowledgeLevel} audience.

${levelInstructions[knowledgeLevel]}

Paper Abstract:
"""
${abstract}
"""

Generate a JSON summary with the following structure:

{
  "one_liner": "A single sentence ELI5-style summary of the entire paper",
  "key_concepts": [
    {
      "name": "Concept Name",
      "explanation": "Explanation appropriate for ${knowledgeLevel} level",
      "visual_metaphor": "A concrete, visual analogy or metaphor (e.g., 'a spotlight on a stage', 'building blocks stacking up')"
    }
  ],
  "key_finding": "The main result or contribution of the paper",
  "real_world_impact": "How this research affects real applications or products"
}

Requirements:
- Include 3-7 key concepts (most important ideas from the paper)
- Visual metaphors MUST be concrete and visualizable (for image generation)
- Adjust complexity to ${knowledgeLevel} level
- Return ONLY valid JSON, no additional text

JSON:
  `.trim();
}
```

#### Task 3.2: Implement Validation
**Location:** `functions/process-generation/src/utils/validation.js`

```javascript
export function validateSummary(summary) {
  const required = ['one_liner', 'key_concepts', 'key_finding', 'real_world_impact'];
  
  for (const field of required) {
    if (!summary[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (!Array.isArray(summary.key_concepts)) {
    throw new Error('key_concepts must be an array');
  }
  
  if (summary.key_concepts.length < 3 || summary.key_concepts.length > 7) {
    throw new Error('Must have 3-7 key concepts');
  }
  
  for (const concept of summary.key_concepts) {
    if (!concept.name || !concept.explanation || !concept.visual_metaphor) {
      throw new Error('Each concept must have name, explanation, and visual_metaphor');
    }
  }
  
  return summary;
}
```

#### Task 3.3: Error Handling & Retries
```javascript
async function summarizeWithRetry(abstract, knowledgeLevel, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const summary = await summarizeWithGradientAI(abstract, knowledgeLevel);
      return validateSummary(summary);
    } catch (error) {
      console.error(`Summarization attempt ${i + 1} failed:`, error);
      lastError = error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }
  
  throw new Error(`Summarization failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

---

### Phase 4: Frontend Integration

#### Task 4.1: Update API Client
**Location:** `src/lib/api.ts`

**Current (Mocked):**
```typescript
export async function generateInfographic(request: GenerateRequest): Promise<GenerationStatus> {
  // Mock implementation
  return { request_id: 'mock', status: 'pending' };
}
```

**New (Real):**
```typescript
import { functions } from './appwrite';

export async function generateInfographic(
  request: GenerateRequest
): Promise<{ request_id: string; status: string; message: string }> {
  const response = await functions.createExecution(
    import.meta.env.VITE_APPWRITE_FUNCTION_GENERATE_ID,
    JSON.stringify(request),
    false, // async execution
    '/',
    'POST'
  );
  
  if (response.statusCode !== 200) {
    throw new Error(`Generation failed: ${response.stderr}`);
  }
  
  return JSON.parse(response.responseBody);
}

export async function getGenerationStatus(
  requestId: string
): Promise<GenerationStatus> {
  const response = await functions.createExecution(
    import.meta.env.VITE_APPWRITE_FUNCTION_STATUS_ID,
    '',
    false,
    `/?requestId=${requestId}`,
    'GET'
  );
  
  if (response.statusCode !== 200) {
    throw new Error(`Status check failed: ${response.stderr}`);
  }
  
  return JSON.parse(response.responseBody);
}
```

#### Task 4.2: Update LoadingState Component
**Location:** `src/components/LoadingState.tsx`

**Changes:**
1. Remove mock timer
2. Add real polling logic
3. Handle errors

```typescript
export const LoadingState = () => {
  const { setStep, setResult, query, requestId, setRequestId } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    async function pollStatus() {
      try {
        const status = await getGenerationStatus(requestId);
        
        // Update progress indicator
        if (status.status === 'finding_paper') setCurrentStep(1);
        if (status.status === 'summarizing') setCurrentStep(2);
        if (status.status === 'generating_image') setCurrentStep(3);
        
        if (status.status === 'complete') {
          clearInterval(pollInterval);
          setResult(status.result);
          setStep('result');
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setError(status.error || 'Generation failed');
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(err.message);
        clearInterval(pollInterval);
      }
    }
    
    pollInterval = setInterval(pollStatus, 2000); // Poll every 2 seconds
    pollStatus(); // Initial call
    
    return () => clearInterval(pollInterval);
  }, [requestId]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => setStep('landing')} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    // ... existing loading UI
  );
};
```

#### Task 4.3: Update LandingPage Component
**Location:** `src/components/LandingPage.tsx`

**Changes:**
1. Call real API on form submit
2. Handle loading state
3. Handle errors

```typescript
async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    setQuery(values.query);
    setKnowledgeLevel(values.knowledgeLevel);
    
    // Call real API
    const response = await generateInfographic({
      query: values.query,
      knowledge_level: values.knowledgeLevel
    });
    
    setRequestId(response.request_id);
    setStep('loading');
  } catch (error) {
    console.error('Generation error:', error);
    // Show error toast or alert
    alert(`Error: ${error.message}`);
  }
}
```

#### Task 4.4: Update App Context
**Location:** `src/lib/app-context.tsx`

**Add `requestId` to context:**
```typescript
interface AppContextType {
  step: Step;
  setStep: (step: Step) => void;
  query: string;
  setQuery: (query: string) => void;
  knowledgeLevel: string;
  setKnowledgeLevel: (level: string) => void;
  result: InfographicResult | null;
  setResult: (result: InfographicResult | null) => void;
  requestId: string; // NEW
  setRequestId: (id: string) => void; // NEW
}
```

---

### Phase 5: Testing & Validation

#### Task 5.1: Test Gradient AI Integration
**Location:** Create `functions/process-generation/test/test-summarizer.js`

```javascript
import { summarizeWithGradientAI } from '../src/agents/gradientSummarizer.js';

const testAbstract = `
The dominant sequence transduction models are based on complex recurrent or 
convolutional neural networks that include an encoder and a decoder. The best 
performing models also connect the encoder and decoder through an attention 
mechanism. We propose a new simple network architecture, the Transformer, 
based solely on attention mechanisms, dispensing with recurrence and convolutions 
entirely.
`;

async function test() {
  console.log('Testing Gradient AI Summarizer...\n');
  
  for (const level of ['beginner', 'intermediate', 'advanced']) {
    console.log(`\nTesting ${level} level:`);
    const summary = await summarizeWithGradientAI(testAbstract, level);
    console.log(JSON.stringify(summary, null, 2));
  }
}

test().catch(console.error);
```

#### Task 5.2: Test End-to-End Flow
**Steps:**
1. Deploy all three Appwrite Functions
2. Configure environment variables
3. Test from frontend:
   - Enter query: "Attention Is All You Need"
   - Select knowledge level: Beginner
   - Verify progression through all stages
   - Check final image and summary

#### Task 5.3: Error Scenarios
Test the following:
- [ ] Invalid ArXiv ID
- [ ] Paper not found
- [ ] Gradient AI timeout
- [ ] FIBO API failure
- [ ] Network errors during polling

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured in Appwrite Console
- [ ] Gradient AI account created and API keys obtained
- [ ] FIBO API key validated
- [ ] FAL API key validated
- [ ] Appwrite Database collections created (run `bun run setup:appwrite`)
- [ ] Appwrite Storage bucket created

### Function Deployment
- [ ] Deploy `generate-poster` function to Appwrite
- [ ] Deploy `get-generation-status` function to Appwrite
- [ ] Deploy `process-generation` function to Appwrite
- [ ] Update `.env` with function IDs

### Frontend Deployment
- [ ] Update `VITE_APPWRITE_FUNCTION_GENERATE_ID` in `.env`
- [ ] Update `VITE_APPWRITE_FUNCTION_STATUS_ID` in `.env`
- [ ] Build frontend: `npm run build`
- [ ] Deploy to Digital Ocean App Platform (or Vercel/Netlify)

### Post-Deployment
- [ ] Test complete user flow in production
- [ ] Monitor Appwrite Function logs
- [ ] Verify Gradient AI usage/billing
- [ ] Verify FIBO API usage/billing
- [ ] Check database for proper data storage
- [ ] Test error handling scenarios

---

## Environment Variables Reference

### Frontend (`.env`)
```bash
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=
VITE_APPWRITE_DATABASE_ID=mitate-db
VITE_APPWRITE_BUCKET_ID=poster-images
VITE_APPWRITE_FUNCTION_GENERATE_ID=
VITE_APPWRITE_FUNCTION_STATUS_ID=
```

### Appwrite Functions (All three functions need these)
```bash
APPWRITE_FUNCTION_PROJECT_ID=
APPWRITE_API_KEY=
GRADIENT_ACCESS_TOKEN=
GRADIENT_WORKSPACE_ID=
FIBO_API_KEY=
FAL_KEY=
DATABASE_ID=mitate-db
BUCKET_ID=poster-images
```

---

## Expected Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Setup | Install deps, configure env vars | 30 minutes |
| Phase 2: Functions | Implement 3 Appwrite Functions | 3-4 hours |
| Phase 3: Gradient AI | Prompt design, integration, testing | 2 hours |
| Phase 4: Frontend | Update API calls, polling logic | 1 hour |
| Phase 5: Testing | E2E tests, error handling | 1-2 hours |
| Deployment | Deploy and validate | 1 hour |
| **TOTAL** | | **8-10 hours** |

---

## Success Criteria

- [ ] User can enter a research topic or ArXiv link
- [ ] System finds relevant paper from ArXiv
- [ ] Gradient AI generates knowledge-level-appropriate summary
- [ ] FIBO generates high-quality infographic
- [ ] Image and summary display correctly on ResultPage
- [ ] User can download PNG
- [ ] Error handling works for all failure modes
- [ ] Polling updates UI in real-time
- [ ] Complete flow takes < 60 seconds for typical paper

---

## Next Steps

1. **Review this plan** - Confirm approach and architecture
2. **Obtain API keys** - Gradient AI, ensure FIBO/FAL keys are active
3. **Start with Phase 1** - Dependencies and environment setup
4. **Implement Phase 2** - Backend functions
5. **Test Gradient AI** - Validate summarization quality
6. **Connect Frontend** - Wire up real API calls
7. **Deploy & Test** - End-to-end validation

---

## Notes & Considerations

- **Cost Management**: Monitor Gradient AI usage (LLM calls), FIBO API usage (image generation)
- **Rate Limiting**: Consider implementing rate limiting on Appwrite Functions
- **Caching**: Future optimization - cache summaries for frequently requested papers
- **PDF Parsing**: Currently using abstracts only; full PDF support is stretch goal
- **Knowledge Level Quality**: May need to iterate on prompt engineering for best results
- **Image Quality**: FIBO may take 30-60s per image; consider showing preview first
- **Error Recovery**: Implement retry logic for transient failures
- **Monitoring**: Set up logging and error tracking (e.g., Sentry)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-13  
**Author:** Implementation Plan Generated by Claude
