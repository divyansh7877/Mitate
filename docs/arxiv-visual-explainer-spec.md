# ArXiv Visual Explainer - Product Specification

**Version:** 1.0  
**Date:** December 12, 2025  
**Hackathons:** MLH Digital Ocean + Bria AI (Fibo)

---

## Executive Summary

ArXiv Visual Explainer transforms dense academic research papers into accessible, visually compelling infographics. Users input a topic or paste an ArXiv link, select their knowledge level, and receive an AI-generated visual explanation tailored to their expertise.

**Core Value Proposition:** Bridge the gap between cutting-edge research and comprehension by generating custom infographics that don't currently exist outside of conference presentations.

---

## Target Users

| Persona | Description | Knowledge Level |
|---------|-------------|-----------------|
| Curious Generalist | Non-technical person interested in AI/science news | Beginner |
| ML Practitioner | Working engineer staying current with research | Intermediate |
| PhD Researcher | Academic needing quick paper summaries for lit review | Advanced |

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           LANDING PAGE                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  "What research topic do you want to understand?"           │    │
│  │  [___________________________________________________]      │    │
│  │                         OR                                  │    │
│  │  "Paste an ArXiv link directly"                            │    │
│  │  [___________________________________________________]      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Knowledge Level:  ○ Beginner   ○ Intermediate   ○ Advanced         │
│                    (ELI5)       (Engineer)        (Researcher)       │
│                                                                      │
│                      [ Generate Visual Explainer ]                   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LOADING STATE                                │
│                                                                      │
│  "Finding relevant papers..."           ✓                           │
│  "Reading and summarizing..."           ◌ (in progress)             │
│  "Generating your infographic..."       ○                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         RESULT PAGE                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │                   [GENERATED INFOGRAPHIC]                   │    │
│  │                        1024 x 1024                          │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Paper: "Attention Is All You Need" (Vaswani et al., 2017)          │
│  ArXiv: https://arxiv.org/abs/1706.03762                            │
│                                                                      │
│  [ Download PNG ]  [ Try Another Topic ]  [ Adjust Level ]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                     │
│                         (React + Vite/Next.js)                           │
│                      Hosted on Digital Ocean App Platform                │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ REST API calls
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         APPWRITE BACKEND                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    Auth     │  │  Database   │  │  Functions  │  │   Storage   │     │
│  │  (optional) │  │ (requests,  │  │ (orchestr.) │  │  (images)   │     │
│  │             │  │  results)   │  │             │  │             │     │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────┘     │
└──────────────────────────────────────────┬───────────────────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
        │   GRADIENT AI     │  │    ARXIV API      │  │     FIBO API      │
        │                   │  │                   │  │                   │
        │  Agent 1: Finder  │  │  Paper metadata   │  │  /v2/image/       │
        │  Agent 2: Summary │  │  PDF abstracts    │  │    generate       │
        │                   │  │                   │  │                   │
        └───────────────────┘  └───────────────────┘  └───────────────────┘
```

---

## Agent System Design (Gradient AI)

### Agent 1: Paper Finder Agent

**Trigger:** User provides topic query (not direct ArXiv link)

**Input:**
```json
{
  "query": "transformer architecture attention mechanisms",
  "max_results": 5
}
```

**Behavior:**
1. Parse user query into ArXiv search terms
2. Call ArXiv API: `http://export.arxiv.org/api/query?search_query=all:{query}&max_results=5&sortBy=relevance`
3. Extract paper metadata (title, authors, abstract, arxiv_id, published_date)
4. Rank by relevance to original query
5. Return top result (or let user choose from top 3 in v2)

**Output:**
```json
{
  "selected_paper": {
    "arxiv_id": "1706.03762",
    "title": "Attention Is All You Need",
    "authors": ["Ashish Vaswani", "Noam Shazeer", "..."],
    "abstract": "The dominant sequence transduction models...",
    "published": "2017-06-12",
    "pdf_url": "https://arxiv.org/pdf/1706.03762.pdf",
    "arxiv_url": "https://arxiv.org/abs/1706.03762"
  }
}
```

### Agent 2: Summarizer Agent

**Trigger:** Paper selected (from Agent 1 or direct link input)

**Input:**
```json
{
  "paper": { "arxiv_id": "...", "title": "...", "abstract": "..." },
  "knowledge_level": "beginner" | "intermediate" | "advanced"
}
```

**Behavior:**
1. Read abstract (MVP) or fetch full PDF text (stretch goal)
2. Generate structured summary based on knowledge level
3. Identify 3-5 key concepts for visual representation
4. Produce Fibo-compatible structured prompt

**Knowledge Level Prompting:**

| Level | Tone | Vocabulary | Detail |
|-------|------|------------|--------|
| Beginner | Friendly, analogies | No jargon, everyday words | High-level "what" and "why" |
| Intermediate | Professional | Technical terms with brief definitions | "How" with practical implications |
| Advanced | Academic | Full technical vocabulary | Nuanced methodology and limitations |

**Output:**
```json
{
  "summary": {
    "title": "Attention Is All You Need",
    "one_liner": "A new way to help computers understand language by focusing on what matters most",
    "key_concepts": [
      {
        "name": "Self-Attention",
        "explanation": "Instead of reading word by word, the model looks at all words at once and decides which ones are most related",
        "visual_metaphor": "A spotlight that can shine on multiple actors on stage simultaneously"
      },
      {
        "name": "Transformer Architecture", 
        "explanation": "The overall design that stacks attention layers to build understanding",
        "visual_metaphor": "A tower where each floor refines the understanding from below"
      },
      {
        "name": "Parallelization",
        "explanation": "Processing everything at once instead of one step at a time",
        "visual_metaphor": "A team of workers all building different parts simultaneously vs. one worker doing everything sequentially"
      }
    ],
    "key_finding": "Transformers outperform previous models while being faster to train",
    "real_world_impact": "This architecture powers ChatGPT, Google Search, and most modern AI"
  },
  "fibo_prompt": "..." // See next section
}
```

---

## Fibo Structured Prompt Strategy

### Infographic Schema Design

Since Fibo's `structured_prompt` is optimized for photorealistic scenes, we adapt it for infographic-style output by:

1. Treating infographic **sections as "objects"** with spatial relationships
2. Using `text_render` array for all textual content
3. Setting `style_medium` to "illustration" or "graphic design"
4. Using flat, clean `background_setting` with solid colors
5. Specifying `artistic_style` as "minimalist, modern infographic, flat design"

### Example Structured Prompt for Beginner-Level Transformer Explainer

```json
{
  "short_description": "A clean, modern infographic explaining the Transformer architecture from the 'Attention Is All You Need' paper. The design uses a vertical flow layout with three main sections, each illustrating a key concept with simple iconography and clear labels. The style is minimalist and educational, suitable for a general audience with no technical background.",
  
  "objects": [
    {
      "description": "A large header banner section at the top containing the title and a simple brain-with-lightbulb icon representing AI understanding",
      "location": "top-center",
      "relationship": "Primary header, introduces the topic",
      "relative_size": "large within frame, approximately 20% of vertical space",
      "shape_and_color": "Rounded rectangle banner, gradient from deep blue (#1a365d) to purple (#553c9a)",
      "texture": "flat, solid color with subtle gradient",
      "appearance_details": "Clean edges, modern sans-serif typography, small decorative neural network pattern in background at 10% opacity",
      "orientation": "horizontal banner spanning full width"
    },
    {
      "description": "First concept section showing 'Self-Attention' as a spotlight metaphor - a stage with multiple actors and a spotlight that splits to illuminate several actors simultaneously",
      "location": "upper-middle, below header",
      "relationship": "First of three main concept sections, visually connected by a vertical flow line",
      "relative_size": "medium, approximately 25% of vertical space",
      "shape_and_color": "Light gray (#f7fafc) rounded container with golden spotlight beams (#ecc94b)",
      "texture": "flat illustration style",
      "appearance_details": "Simplified human figures on a stage, geometric spotlight beams, numbered label '1' in a circle",
      "orientation": "horizontal section"
    },
    {
      "description": "Second concept section showing 'Transformer Architecture' as a tower metaphor - a multi-layered tower with each floor slightly smaller, arrows showing information flowing upward",
      "location": "center",
      "relationship": "Second concept section, connected to first and third by vertical flow line",
      "relative_size": "medium, approximately 25% of vertical space", 
      "shape_and_color": "Light blue (#ebf8ff) rounded container with teal tower blocks (#319795)",
      "texture": "flat illustration style with subtle shadows for depth",
      "appearance_details": "Stacked rectangular blocks forming a tower, upward arrows between layers, numbered label '2' in a circle",
      "orientation": "horizontal section"
    },
    {
      "description": "Third concept section showing 'Parallelization' as a team metaphor - split view comparing one worker doing sequential tasks vs. multiple workers doing tasks simultaneously",
      "location": "lower-middle, above footer",
      "relationship": "Third concept section, final explanation before conclusion",
      "relative_size": "medium, approximately 25% of vertical space",
      "shape_and_color": "Light green (#f0fff4) rounded container with contrasting red (#fc8181) for slow/sequential and green (#68d391) for fast/parallel",
      "texture": "flat illustration style",
      "appearance_details": "Left side shows single figure with clock showing long time, right side shows multiple figures with clock showing short time, 'vs' divider in middle, numbered label '3' in a circle",
      "orientation": "horizontal section with internal left-right split"
    },
    {
      "description": "Footer section with key takeaway callout box and source citation",
      "location": "bottom-center",
      "relationship": "Concluding section summarizing the main insight",
      "relative_size": "small, approximately 10% of vertical space",
      "shape_and_color": "Dark blue (#2d3748) rounded rectangle with white text",
      "texture": "flat, solid",
      "appearance_details": "Contains key finding text and ArXiv citation link, small decorative checkmark icon",
      "orientation": "horizontal footer spanning full width"
    },
    {
      "description": "Vertical connecting line with arrows flowing downward between the three concept sections, representing the logical flow of ideas",
      "location": "center, spanning from section 1 to section 3",
      "relationship": "Visual connector showing progression through concepts",
      "relative_size": "thin vertical element",
      "shape_and_color": "Dashed gray line (#a0aec0) with small arrow heads",
      "texture": "simple line graphic",
      "appearance_details": "Dotted or dashed style, subtle and not distracting",
      "orientation": "vertical"
    }
  ],
  
  "background_setting": "A clean, seamless white (#ffffff) background providing maximum contrast and readability for the infographic content. No texture or patterns - pure minimalist canvas.",
  
  "lighting": {
    "conditions": "Flat, even lighting typical of graphic design - no dramatic shadows",
    "direction": "Ambient, non-directional",
    "shadows": "Minimal, only subtle drop shadows on container sections to create slight depth separation"
  },
  
  "aesthetics": {
    "composition": "Vertical flow layout, top-to-bottom reading order, centered alignment with consistent margins",
    "color_scheme": "Professional and accessible - primary blue/purple for headers, pastel section backgrounds (gray, blue, green), high contrast text. Follows WCAG accessibility guidelines.",
    "mood_atmosphere": "Educational, approachable, trustworthy, modern",
    "preference_score": "very high",
    "aesthetic_score": "very high"
  },
  
  "photographic_characteristics": {
    "depth_of_field": "Not applicable - flat graphic design",
    "focus": "Sharp throughout - all elements equally crisp",
    "camera_angle": "Straight-on, orthographic view",
    "lens_focal_length": "Not applicable - 2D illustration"
  },
  
  "style_medium": "digital illustration, infographic",
  
  "text_render": [
    {
      "text": "ATTENTION IS ALL YOU NEED",
      "location": "top header banner, centered",
      "size": "large, primary headline",
      "color": "white (#ffffff)",
      "font": "bold sans-serif, modern (similar to Inter or Helvetica Neue)",
      "appearance_details": "All caps, letter-spacing slightly expanded for readability"
    },
    {
      "text": "How Transformers Changed AI Forever",
      "location": "top header banner, below main title",
      "size": "medium, subtitle",
      "color": "light purple (#d6bcfa)",
      "font": "regular sans-serif",
      "appearance_details": "Sentence case, smaller than main title"
    },
    {
      "text": "1. SELF-ATTENTION",
      "location": "first section, top-left of container",
      "size": "medium, section header",
      "color": "dark gray (#2d3748)",
      "font": "bold sans-serif",
      "appearance_details": "Numbered for sequence, all caps"
    },
    {
      "text": "The model looks at all words simultaneously and decides which ones matter most - like a spotlight that can shine on multiple actors at once",
      "location": "first section, below header",
      "size": "small, body text",
      "color": "gray (#4a5568)",
      "font": "regular sans-serif",
      "appearance_details": "Left-aligned, comfortable line height"
    },
    {
      "text": "2. TRANSFORMER ARCHITECTURE",
      "location": "second section, top-left of container",
      "size": "medium, section header",
      "color": "dark gray (#2d3748)",
      "font": "bold sans-serif",
      "appearance_details": "Numbered for sequence, all caps"
    },
    {
      "text": "Layers of attention stack up like floors in a tower, each one refining the understanding from below",
      "location": "second section, below header",
      "size": "small, body text",
      "color": "gray (#4a5568)",
      "font": "regular sans-serif",
      "appearance_details": "Left-aligned, comfortable line height"
    },
    {
      "text": "3. PARALLELIZATION",
      "location": "third section, top-left of container",
      "size": "medium, section header",
      "color": "dark gray (#2d3748)",
      "font": "bold sans-serif",
      "appearance_details": "Numbered for sequence, all caps"
    },
    {
      "text": "Everything processes at once instead of step-by-step - like a team building together vs. one person doing all the work",
      "location": "third section, below header",
      "size": "small, body text",
      "color": "gray (#4a5568)",
      "font": "regular sans-serif",
      "appearance_details": "Left-aligned, comfortable line height"
    },
    {
      "text": "KEY INSIGHT: Transformers power ChatGPT, Google Search, and most modern AI",
      "location": "footer section, centered",
      "size": "small, callout",
      "color": "white (#ffffff)",
      "font": "medium weight sans-serif",
      "appearance_details": "High contrast for emphasis"
    },
    {
      "text": "Source: arxiv.org/abs/1706.03762",
      "location": "footer section, bottom-right",
      "size": "extra small, citation",
      "color": "light gray (#a0aec0)",
      "font": "regular sans-serif",
      "appearance_details": "Subtle, not distracting"
    }
  ],
  
  "context": "This is an educational infographic designed for social media sharing (LinkedIn, Twitter) and personal learning. Target audience is intelligent adults with no machine learning background who want to understand influential AI research papers. The design should be immediately comprehensible and shareable.",
  
  "artistic_style": "minimalist, modern infographic, flat design, clean vector illustration, educational, professional"
}
```

---

## Knowledge Level Variations

The same paper produces different outputs based on knowledge level:

### Beginner (ELI5)
- Visual metaphors (spotlights, towers, teams)
- No technical terms
- Focus on "what does this mean for me?"
- Bright, friendly colors
- 3 simple concepts max

### Intermediate (Engineer)
- Technical diagrams with labels
- Key equations shown (not derived)
- Comparison to prior approaches (RNNs, LSTMs)
- Professional color palette
- 4-5 concepts with practical implications

### Advanced (Researcher)
- Architecture diagrams with layer details
- Mathematical notation for attention formula
- Ablation study highlights
- Muted, academic color palette
- 5-7 concepts including methodology nuances

---

## Data Models (Appwrite Database)

### Collection: `requests`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Appwrite document ID |
| `user_id` | string | Optional, if auth enabled |
| `query` | string | User's input query or ArXiv link |
| `query_type` | string | "topic" or "arxiv_link" |
| `knowledge_level` | string | "beginner", "intermediate", "advanced" |
| `status` | string | "pending", "finding_paper", "summarizing", "generating_image", "complete", "failed" |
| `created_at` | datetime | Timestamp |
| `updated_at` | datetime | Timestamp |

### Collection: `results`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Appwrite document ID |
| `request_id` | string | Reference to requests collection |
| `arxiv_id` | string | Paper identifier |
| `paper_title` | string | Paper title |
| `paper_url` | string | ArXiv URL |
| `summary_json` | string | JSON blob of summarizer output |
| `fibo_structured_prompt` | string | Full structured prompt sent to Fibo |
| `fibo_seed` | integer | Seed for reproducibility |
| `image_url` | string | Fibo-returned URL (temporary) |
| `image_storage_id` | string | Appwrite Storage file ID (permanent) |
| `created_at` | datetime | Timestamp |

---

## API Endpoints (Appwrite Functions)

### POST `/api/generate`

**Request:**
```json
{
  "query": "how do transformers work" | "https://arxiv.org/abs/1706.03762",
  "knowledge_level": "beginner"
}
```

**Response (async - returns immediately):**
```json
{
  "request_id": "abc123",
  "status": "pending",
  "message": "Your visual explainer is being generated"
}
```

### GET `/api/status/{request_id}`

**Response:**
```json
{
  "request_id": "abc123",
  "status": "complete",
  "result": {
    "paper_title": "Attention Is All You Need",
    "paper_url": "https://arxiv.org/abs/1706.03762",
    "image_url": "https://cloud.appwrite.io/v1/storage/files/xyz789/view",
    "summary": { ... }
  }
}
```

---

## Tech Stack Summary

| Component | Technology | Hackathon Requirement |
|-----------|------------|----------------------|
| Frontend | React + Vite (or Next.js) | - |
| Hosting | Digital Ocean App Platform | MLH/DO ✓ |
| Backend/Auth/DB | Appwrite Cloud | - |
| Agent Orchestration | Gradient AI | MLH/DO ✓ |
| Paper Data | ArXiv API | - |
| Image Generation | Fibo (Bria AI) | Bria AI ✓ |
| File Storage | Appwrite Storage | - |

---

## MVP Scope (Hackathon Weekend)

### Must Have (P0)
- [ ] Landing page with query input and knowledge level selector
- [ ] Single topic → single paper → single infographic flow
- [ ] Paper Finder Agent (Gradient AI + ArXiv API)
- [ ] Summarizer Agent (Gradient AI)
- [ ] Fibo image generation with structured prompt
- [ ] Result display page with image and paper citation
- [ ] Basic loading states

### Should Have (P1)
- [ ] Direct ArXiv link input (bypass finder agent)
- [ ] Download PNG button
- [ ] Image saved to Appwrite Storage (not just Fibo temp URL)
- [ ] Request history in database

### Nice to Have (P2)
- [ ] User accounts (Appwrite Auth)
- [ ] Save/bookmark generated explainers
- [ ] "Try different knowledge level" regeneration
- [ ] Share to LinkedIn/Twitter buttons
- [ ] Multiple paper selection from search results

### Out of Scope (v2+)
- Full PDF parsing (abstract only for MVP)
- Multi-page infographics
- Video explainers
- Custom color themes
- API for third-party integrations

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fibo struggles with infographic layout | Medium | High | Test structured prompt immediately; fallback to simpler "concept illustration + text card" format |
| Text rendering in images is illegible | Medium | Medium | Reduce text density; use larger fonts; consider overlay approach |
| ArXiv API rate limiting | Low | Medium | Cache results; implement backoff |
| Gradient AI latency | Medium | Low | Show detailed loading states; async processing |
| Scope creep | High | High | Strict MVP focus; cut P1/P2 if needed |

---

## Immediate Next Steps

1. **Test Fibo NOW** - Generate one infographic with the example structured prompt above before writing any other code
2. **Set up Appwrite project** - Create database collections and storage bucket
3. **Scaffold frontend** - Basic React app with form and result display
4. **Build Paper Finder Agent** - Gradient AI + ArXiv API integration
5. **Build Summarizer Agent** - Knowledge-level-aware summarization
6. **Connect Fibo** - Structured prompt generation and image retrieval
7. **Polish and deploy** - Digital Ocean App Platform

---

## Success Metrics

- Demo works end-to-end without errors
- Generated infographic is comprehensible to target knowledge level
- Judges can understand value prop in <30 seconds
- Submission meets both hackathon requirements (Gradient AI + Fibo)

---

*Last updated: December 12, 2025*
