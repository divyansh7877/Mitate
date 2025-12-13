/**
 * Prompt Templates for Summary → FIBO Pipeline Compiler
 * These prompts guide the LLM to act as a deterministic compiler
 */

/**
 * SYSTEM PROMPT (EXACT - from spec)
 * This is the canonical instruction for the LLM compiler
 */
export const SYSTEM_PROMPT = `You are a deterministic compiler that converts semantic summaries into
TypeScript configuration objects for a poster-generation pipeline.

Your output must STRICTLY conform to the provided TypeScript schema.

Rules:
- Output ONLY valid TypeScript
- Export a single constant named \`exampleSummary\`
- Do NOT include comments, explanations, or markdown
- Do NOT invent fields not present in the schema
- All enum values must be chosen from the allowed set
- If information is missing, infer conservatively and generically
- Optimize for consistency and machine execution, not creativity`;

/**
 * Schema definition for the user prompt
 */
const SCHEMA_DEFINITION = `export interface Concept {
  name: string;
  explanation: string;
  visual_metaphor: string;
}

export interface Summary {
  title: string;
  one_liner: string;
  key_concepts: Concept[];
  key_finding: string;
  real_world_impact?: string;
}

export interface UserPreferences {
  background?: string;
  preferred_colors?: string[];
  style_preference?: "minimalist" | "detailed" | "academic";
  style_hints?: string;
}

export type KnowledgeLevel = "beginner" | "intermediate" | "advanced";

export interface GenerationOptions {
  include_layout_previews?: boolean;
  include_variations?: boolean;
  generation_mode?: string;
}

export interface GenerationInput {
  summary: Summary;
  knowledge_level: KnowledgeLevel;
  user_preferences?: UserPreferences;
  tags: string[];
  arxiv_id: string;
  options?: GenerationOptions;
}`;

/**
 * Reference example for few-shot learning
 */
const REFERENCE_EXAMPLE = `export const exampleSummary: GenerationInput = {
  summary: {
    title: "Attention Is All You Need",
    one_liner: "A new neural network architecture called Transformer that uses attention mechanisms instead of recurrence for sequence processing",
    key_concepts: [
      {
        name: "Self-Attention",
        explanation: "A mechanism that allows each position in a sequence to attend to all positions in the previous layer, computing relationships between all pairs",
        visual_metaphor: "Like a room full of people where everyone can talk to everyone else at once, rather than passing messages in a line"
      },
      {
        name: "Multi-Head Attention",
        explanation: "Running multiple attention operations in parallel, allowing the model to focus on different aspects of the input simultaneously",
        visual_metaphor: "Having multiple sets of eyes, each focusing on different patterns (colors, shapes, textures) at the same time"
      },
      {
        name: "Positional Encoding",
        explanation: "Adding information about the position of tokens in the sequence, since attention has no built-in notion of order",
        visual_metaphor: "Like adding timestamps to messages so you know the order they were sent, even if they arrive out of sequence"
      }
    ],
    key_finding: "The Transformer architecture achieves state-of-the-art results on translation tasks while being more parallelizable and requiring significantly less time to train than recurrent models",
    real_world_impact: "Powers modern language models like GPT and BERT, enabling breakthrough applications in translation, text generation, code completion, and conversational AI"
  },
  knowledge_level: "beginner",
  user_preferences: {
    background: "computer science",
    preferred_colors: ["blue", "purple"],
    style_preference: "detailed",
    style_hints: "Technical but accessible, with clear visual metaphors"
  },
  tags: ["deep-learning", "nlp", "architecture", "conceptual"],
  arxiv_id: "1706.03762",
  options: {
    include_layout_previews: true,
    include_variations: false,
    generation_mode: "high_quality"
  }
};`;

/**
 * Generate user prompt from summary text
 */
export function generateUserPrompt(summaryText: string, metadata?: {
  arxivId?: string;
  knowledgeLevel?: string;
  tags?: string[];
}): string {
  return `TARGET SCHEMA (authoritative):

${SCHEMA_DEFINITION}

REFERENCE EXAMPLE:

${REFERENCE_EXAMPLE}

INPUT SUMMARY:

"""
${summaryText}
"""

${metadata ? `
METADATA:
${metadata.arxivId ? `- ArXiv ID: ${metadata.arxivId}` : ''}
${metadata.knowledgeLevel ? `- Knowledge Level: ${metadata.knowledgeLevel}` : ''}
${metadata.tags ? `- Tags: ${metadata.tags.join(', ')}` : ''}
` : ''}

Generate the TypeScript object now.`;
}

/**
 * Two-pass mode: Semantic extraction prompt (Pass 1)
 */
export const SEMANTIC_EXTRACTION_SYSTEM_PROMPT = `You are a semantic analyzer that extracts structured information from research paper summaries.

Your task is to analyze the input text and extract key information in JSON format.

Output ONLY valid JSON with the following structure:
{
  "title": "paper title",
  "mainIdea": "one-sentence summary",
  "keyConcepts": [
    {
      "name": "concept name",
      "explanation": "what it means",
      "visualMetaphor": "how to visualize it"
    }
  ],
  "keyFinding": "main result or contribution",
  "realWorldImpact": "practical applications",
  "audienceLevel": "beginner | intermediate | advanced",
  "suggestedTags": ["tag1", "tag2"],
  "styleHints": "visual style suggestions"
}`;

/**
 * Generate semantic extraction prompt
 */
export function generateSemanticExtractionPrompt(summaryText: string): string {
  return `Extract structured information from this research paper summary:

"""
${summaryText}
"""

Output the JSON structure now. Be thorough but concise.`;
}

/**
 * Two-pass mode: Compilation prompt (Pass 2)
 */
export function generateCompilationPromptFromSemanticData(semanticData: any): string {
  const semanticDataStr = JSON.stringify(semanticData, null, 2);

  return `TARGET SCHEMA (authoritative):

${SCHEMA_DEFINITION}

REFERENCE EXAMPLE:

${REFERENCE_EXAMPLE}

SEMANTIC DATA (already extracted):

${semanticDataStr}

Using the semantic data above, generate the TypeScript object that conforms to the GenerationInput schema.
Ensure all required fields are present and all enum values are from the allowed set.

Generate the TypeScript object now.`;
}

/**
 * Validation retry prompt (when validation fails)
 */
export function generateValidationRetryPrompt(
  originalPrompt: string,
  validationErrors: string[]
): string {
  return `${originalPrompt}

IMPORTANT: The previous output failed schema validation with the following errors:

${validationErrors.map((err, i) => `${i + 1}. ${err}`).join('\n')}

Fix the output to address these errors. Do not change unrelated fields.
Generate the corrected TypeScript object now.`;
}
