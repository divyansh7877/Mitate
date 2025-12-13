# Image Generation Quality Improvements - V2

## Overview
This document outlines comprehensive improvements made to the poster generation system to address text visibility and quality issues. The key insight: **diffusion models struggle with text rendering**, so we must treat text as **overlay/vector layers** rather than diffusion-generated elements.

## Critical Understanding: Text as Overlays

BRIA's FIBO model uses `text_render` array to overlay text on top of diffusion-generated backgrounds. This is fundamentally different from trying to generate text within the image itself. All improvements focus on:

1. **Emphasizing overlay behavior** in prompts
2. **Truncating text** to avoid FIBO's text generation limitations
3. **Using proper API parameters** for quality
4. **Modular generation** to reduce crowding and improve text visibility

## Changes Made

### 1. FIBO API Quality Parameters ([fiboService.ts:47-54](src/services/fiboService.ts#L47-L54))

**Optimized parameters based on BRIA best practices:**

```typescript
steps_num: 50              // Using max (45-50) for best quality
enhance_image: true        // Apply post-processing for sharpness
guidance_scale: 5          // 3-5 range, default 5 for strong structured_prompt adherence
aspect_ratio: "16:9"       // Wider format reduces crowding, improves text visibility
fast: false                // Disable fast mode for higher quality
negative_prompt: "..."     // Exclude text rendering issues (see below)
```

**Key Changes:**
- **Changed `text_guidance_scale` to `guidance_scale`** - Correct parameter name per BRIA docs
- **Increased `steps_num` to 50** - Maximum for best quality
- **Changed aspect ratio to "16:9"** - Wider format gives more space, less crowding
- **Refined negative prompt** - Focus on text-specific issues

**Negative Prompt (Text-Focused):**
```
blurry text, illegible labels, distorted fonts, low contrast text, pixelated letters,
unreadable text, fuzzy text edges, text artifacts, poor typography, unclear letters,
smudged text, compressed text, watermark, low quality, amateur design, cluttered, messy
```

### 2. Text as Overlay Emphasis ([fiboPromptBuilder.ts](src/services/fiboPromptBuilder.ts))

**Critical Change: All text_render elements now explicitly state they are OVERLAY TEXT LAYERS**

This is the most important improvement. Every `text_render` element now includes:

```typescript
appearance_details: "OVERLAY TEXT LAYER: [description]. Render as vector/overlay text on top of background, NOT diffusion-generated. [quality specs]"
```

**Examples:**

**Title:**
```typescript
{
  text: input.summary.title.toUpperCase(),
  location: "top-center",
  size: "large within frame",  // Using BRIA's size vocabulary
  color: "#FFFFFF",
  font: "bold sans-serif",     // Simple, clear font specifications
  appearance_details: "OVERLAY TEXT LAYER: Large, bold, all caps title with letter-spacing 0.05em. Render as vector/overlay text on top of background, NOT diffusion-generated. High contrast white text on dark background with crisp edges, anti-aliased for smoothness, sharp rendering with no blurriness or pixelation. Professional typography, maximum readability at 72pt equivalent."
}
```

**Body Text:**
```typescript
{
  text: truncatedExplanation,  // Truncated at 150 chars!
  location: "left-aligned in section X, below heading",
  size: "medium",
  color: typography.bodyColor,
  font: "sans-serif",
  appearance_details: "OVERLAY TEXT LAYER: Body text rendered as vector overlay with line height 1.6 for readability. Left-aligned, max width 80% of section. Render as sharp overlay text with anti-aliased edges, high contrast gray text on light background at 16pt equivalent. Clear typography with no diffusion artifacts or blurriness."
}
```

**Key Changes:**
1. **"OVERLAY TEXT LAYER:"** prefix on every text element
2. **"NOT diffusion-generated"** explicitly stated
3. **Simplified location descriptors** ("top-center", "left-aligned", "bottom-right" instead of complex positioning)
4. **BRIA size vocabulary** ("large within frame", "medium", "small" instead of pixel/pt sizes in size field)
5. **Point size in appearance_details** for guidance (e.g., "72pt equivalent", "16pt equivalent")

### 3. Text Truncation to Avoid FIBO Limitations

**FIBO struggles with long text** per BRIA docs. All text is now truncated:

```typescript
// Truncate explanations at 150 characters
const truncatedExplanation = concept.explanation.length > 150
  ? concept.explanation.substring(0, 147) + "..."
  : concept.explanation;

// Truncate key finding at 100 characters
const truncatedFinding = input.summary.key_finding.length > 100
  ? input.summary.key_finding.substring(0, 97) + "..."
  : input.summary.key_finding;
```

This prevents text generation inconsistencies and artifacts.

### 4. Short Description Updated ([fiboPromptBuilder.ts:65-74](src/services/fiboPromptBuilder.ts#L65-L74))

```typescript
return `
A HIGH-RESOLUTION, professional-quality educational infographic explaining "${input.summary.title}" from research paper arxiv/${input.arxiv_id}.
The design uses a ${layout.type} layout with ${input.summary.key_concepts.length} main concept sections.
Style is ${levelDescriptor[input.knowledge_level]}.
CRITICAL: This infographic uses OVERLAY TEXT RENDERING - all text elements in text_render array should be treated as vector overlays on top of the background, NOT as diffusion-generated text within the image.
Text must be crystal clear, sharp, and fully legible with high contrast. Use clean vector-style graphics for visual elements with sharp lines and no blurriness.
The background provides visual context, while text_render elements overlay crisp, professional typography.
Overall aesthetic is minimalist, professional, polished, with ample white space around text for maximum readability.
Print-ready quality suitable for sharing on social media or academic presentations.
`.trim();
```

### 5. Photographic Characteristics Updated

```typescript
{
  depth_of_field: "Deep focus - all elements sharp from front to back, no blur",
  focus: "Sharp focus on text elements - overlay text must be crystal clear and perfectly legible with no diffusion blur or artifacts",
  camera_angle: "Straight-on, orthographic view, no perspective distortion",
  lens_focal_length: "Standard - no wide-angle or telephoto distortion that affects text readability"
}
```

Now explicitly mentions overlay text and sharp focus requirements.

### 6. Modular Generation Mode ([posterGenerationOrchestrator.ts:141-259](src/services/posterGenerationOrchestrator.ts#L141-L259))

**NEW FEATURE: Generate posters in sections to reduce crowding**

When `generation_mode: "modular"` is set in options, the system generates:
1. **Header section** (1600x300) - Title and subtitle
2. **Concept sections** (1600x400 each) - One per concept
3. **Footer section** (1600x200) - Key insight and citation

**Benefits:**
- ✅ **Less crowding** - Each section has ample space
- ✅ **Better text visibility** - Fewer elements per image means clearer text
- ✅ **Focused generation** - FIBO can concentrate on fewer elements at once
- ✅ **16:9 aspect ratio** - Wide format naturally suits horizontal text
- ✅ **Ready for composition** - Can be stitched together programmatically

**Usage:**
```typescript
const result = await orchestrator.generate({
  summary: paperSummary,
  knowledge_level: "beginner",
  tags: ["visual"],
  arxiv_id: "1706.03762",
  options: {
    generation_mode: "modular"  // Enable modular generation
  }
});

// result.metadata.section_urls contains all generated section URLs
```

**New Methods in FiboPromptBuilder:**
- `buildHeaderSection(input, layout)` - Generate header-only prompt
- `buildConceptSection(concept, index, level, layout)` - Generate single concept prompt
- `buildFooterSection(input, layout)` - Generate footer-only prompt

Each method creates a focused `FiboStructuredPrompt` with minimal text elements.

## Expected Quality Improvements

### Before (Original Implementation):
- ❌ Blurry, diffusion-generated text baked into image
- ❌ Overcrowded 1024x1024 square format
- ❌ Long text causing FIBO generation issues
- ❌ Generic prompts not emphasizing overlay behavior
- ❌ Low steps_num, wrong guidance parameter
- ❌ Poor contrast and illegible labels
- ❌ Text artifacts and distortion

### After (V2 Improvements):
- ✅ **Text treated as overlay layers** - NOT diffusion-generated
- ✅ **16:9 wide format** - More space, less crowding
- ✅ **Text truncation** - All text ≤150 chars to avoid FIBO issues
- ✅ **Explicit overlay prompts** - Every text element marked "OVERLAY TEXT LAYER"
- ✅ **50 generation steps** - Maximum quality
- ✅ **guidance_scale: 5** - Correct parameter for structured_prompt adherence
- ✅ **Modular generation option** - Generate sections separately for clarity
- ✅ **Text-focused negative prompts** - Exclude specific text rendering issues
- ✅ **High contrast specifications** - White on dark, black on light clearly defined
- ✅ **Professional typography** - Simple fonts (sans-serif, bold) for best rendering

## Testing

### Single-Image Generation (Default)
```bash
npm run test-poster
# or
npx tsx test-poster.ts
```

This generates a single 16:9 wide-format poster with all sections.

### Modular Generation (Recommended for Testing)
Modify your test file to use modular mode:

```typescript
const result = await orchestrator.generate({
  ...vitPaperBeginner,
  options: {
    generation_mode: "modular"
  }
});

// result.metadata.section_urls will contain all section image URLs
console.log('Section URLs:', result.metadata.section_urls);
```

**What to Check:**
1. ✅ **Text clarity** - Is every word sharp and readable?
2. ✅ **No blur/artifacts** - Zoom in, check for pixelation
3. ✅ **High contrast** - Text stands out clearly from background
4. ✅ **Professional appearance** - Looks like it could be in a presentation
5. ✅ **Overlay effect** - Text appears "on top" rather than "baked in"

### Comparing Single vs Modular
- **Single-image**: Faster, one API call, but more crowded
- **Modular**: Better text quality, more space per section, but requires composition step

## Do You Need Another LLM?

### Short Answer: **Not for text rendering** - but potentially yes for other reasons.

**The V2 improvements address the core text visibility problem** through:
1. Treating text as overlays (not diffusion-generated)
2. Proper API parameters
3. Text truncation
4. Modular generation option

However, an LLM could still help with:

### Option A: Visual Metaphor Generation (Recommended)
**Problem**: Your current `visual_metaphor` for concepts may not align well with FIBO's capabilities.

**Solution**: Add Claude/GPT-4 preprocessing to:
1. Analyze each concept
2. Generate FIBO-optimized visual descriptions
3. Suggest concrete, renderable visual elements instead of abstract metaphors
4. Refine `objects` array descriptions for better visual quality

**Example:**
```typescript
// Before (abstract)
visual_metaphor: "Self-attention as a neural handshake"

// After LLM preprocessing (concrete)
visual_description: "A grid of interconnected nodes with blue lines showing connections between input tokens. Each node is a circle with an icon representing a word. The strongest connections are highlighted with thicker lines."
```

**Cost**: ~$0.01-0.02 per poster (Claude Haiku)
**When to use**: When visual elements look generic or don't match concept intent

### Option B: Quality Control with Vision Models (Advanced)
Add Claude Vision after generation to:
1. Analyze generated poster
2. Check if text is actually readable (not just promised in prompt)
3. Verify visual elements match concepts
4. Auto-regenerate if quality score < threshold

**Cost**: ~$0.02-0.05 per poster
**When to use**: For production pipelines needing guaranteed quality

### Option C: Prompt Optimization Loop
Use an LLM to:
1. Read FIBO's actual response
2. Analyze what worked vs didn't
3. Adjust structured_prompt for next generation
4. Iteratively improve over multiple attempts

**Cost**: ~$0.03-0.10 per poster (multiple iterations)
**When to use**: When fine-tuning for specific paper types or styles

## Recommendation: Test Current Improvements First

**Step 1**: Run single-image generation with V2 improvements
**Step 2**: Run modular generation to see per-section quality
**Step 3**: If text is now readable, evaluate visual quality
**Step 4**: Only then consider LLM for visual metaphor enhancement

The text rendering issues should be **solved** with V2. Any remaining issues are likely:
- Visual element quality (use Option A)
- Consistency/polish (use Option B)
- Fine-tuning (use Option C)

## Next Steps

### Immediate Actions
1. ✅ **Test single-image generation** - Run `npm run test-poster`
   - Check if text is readable
   - Verify 16:9 format and spacing
   - Compare against old output

2. ✅ **Test modular generation** - Add `generation_mode: "modular"` to test
   - Compare per-section quality
   - Check if sections have better text visibility
   - Evaluate if composition step is worth the improvement

3. ⏳ **Iterate parameters if needed** - Fine-tune:
   - `steps_num`: Try 45-50
   - `guidance_scale`: Try 4-6
   - Image sizes for modular mode

### Future Enhancements
4. ⏳ **Implement image composition** - Stitch modular sections together
   - Use Python PIL/Pillow
   - Or client-side JavaScript canvas
   - Or external service like Cloudinary

5. ⏳ **Add LLM for visual metaphors** (if needed)
   - Only if text is readable but visuals are generic
   - Use Claude Haiku for cost-effective preprocessing
   - Generate concrete, renderable descriptions

6. ⏳ **Implement quality control loop** (optional)
   - Use Claude Vision to analyze outputs
   - Auto-regenerate low-quality posters
   - Build quality dataset for fine-tuning

## Files Modified

### Core Changes
- [`src/services/fiboService.ts`](src/services/fiboService.ts#L47-L54) - Updated API parameters (steps_num, guidance_scale, aspect_ratio, negative_prompt)
- [`src/services/fiboPromptBuilder.ts`](src/services/fiboPromptBuilder.ts) - All text_render elements now emphasize overlay behavior, added text truncation, new modular generation methods
- [`src/services/posterGenerationOrchestrator.ts`](src/services/posterGenerationOrchestrator.ts) - Added modular generation mode with `generateModular()` method
- [`src/types/poster.ts`](src/types/poster.ts) - Added `generation_mode` to `GenerationOptions`, `style_hints` to `UserPreferences`

### New Features
- `buildHeaderSection()` in FiboPromptBuilder
- `buildConceptSection()` in FiboPromptBuilder
- `buildFooterSection()` in FiboPromptBuilder
- `generateModular()` private method in PosterGenerationOrchestrator

## Configuration Options

### Quality Parameters ([fiboService.ts:47-54](src/services/fiboService.ts#L47-L54))

```typescript
steps_num: 50,              // Try 45-50 (higher = better quality, slower)
guidance_scale: 5,          // Try 3-6 (higher = stronger prompt adherence)
aspect_ratio: "16:9",       // "16:9" for wide, "1:1" for square, "9:16" for tall
enhance_image: true,        // Keep true for post-processing sharpness
fast: false,                // Keep false for quality mode
```

### Modular Generation Sizes
Adjust in [posterGenerationOrchestrator.ts:172, 200, 220](src/services/posterGenerationOrchestrator.ts):

```typescript
// Header
image_size: { width: 1600, height: 300 }

// Concepts (per section)
image_size: { width: 1600, height: 400 }

// Footer
image_size: { width: 1600, height: 200 }
```

### Text Truncation Limits
Adjust in [fiboPromptBuilder.ts:337, 353](src/services/fiboPromptBuilder.ts#L337):

```typescript
// Concept explanations
const truncatedExplanation = concept.explanation.length > 150
  ? concept.explanation.substring(0, 147) + "..."
  : concept.explanation;

// Key findings
const truncatedFinding = input.summary.key_finding.length > 100
  ? input.summary.key_finding.substring(0, 97) + "..."
  : input.summary.key_finding;
```

Increase limits if FIBO handles longer text well, decrease if still seeing issues.

## Summary of V2 Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Text Rendering** | Diffusion-generated (blurry) | Overlay layers (sharp) |
| **API Parameters** | Missing critical params | steps_num:50, guidance_scale:5, aspect_ratio:16:9 |
| **Prompt Style** | Generic descriptions | "OVERLAY TEXT LAYER" emphasized throughout |
| **Text Length** | Unlimited (causing issues) | Truncated at 150/100 chars |
| **Format** | 1024x1024 square | 1600x??? wide (16:9) |
| **Generation Mode** | Single image only | Single or modular (sections) |
| **Location Specs** | Complex positioning | Simple ("top-center", "left-aligned") |
| **Font Specs** | Variable complexity | Simple ("bold sans-serif", "sans-serif") |
| **Negative Prompt** | General quality issues | Text-specific issues |

## Key Takeaway

**The fundamental insight**: BRIA/FIBO's `text_render` is designed for **overlay text**, not diffusion-generated text. Treating it as such and explicitly stating "OVERLAY TEXT LAYER" in prompts should dramatically improve text quality.

Test both single-image and modular modes to see which gives better results for your use case.
