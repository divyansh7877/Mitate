/**
 * Zod schema for validating LLM-generated GenerationInput configurations
 * This is the AUTHORITATIVE schema used by the Summary → FIBO Pipeline Compiler
 */

import { z } from "zod";
import type { GenerationInput } from "../types/poster";

// ============================================================================
// CONCEPT SCHEMA
// ============================================================================

export const ConceptSchema = z.object({
  name: z.string().min(1, "Concept name is required"),
  explanation: z.string().min(10, "Explanation must be at least 10 characters"),
  visual_metaphor: z.string().min(5, "Visual metaphor is required"),
});

// ============================================================================
// SUMMARY SCHEMA
// ============================================================================

export const SummarySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  one_liner: z.string().min(10, "One-liner must be at least 10 characters").max(300, "One-liner must be under 300 characters"),
  key_concepts: z.array(ConceptSchema).min(1, "At least one concept is required").max(6, "Maximum 6 concepts allowed"),
  key_finding: z.string().min(10, "Key finding is required"),
  real_world_impact: z.string().optional(),
});

// ============================================================================
// USER PREFERENCES SCHEMA
// ============================================================================

export const UserPreferencesSchema = z.object({
  background: z.string().optional(),
  preferred_colors: z.array(z.string()).optional(),
  style_preference: z.enum(["minimalist", "detailed", "academic"]).optional(),
  style_hints: z.string().optional(),
});

// ============================================================================
// KNOWLEDGE LEVEL SCHEMA
// ============================================================================

export const KnowledgeLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

// ============================================================================
// GENERATION OPTIONS SCHEMA
// ============================================================================

export const GenerationOptionsSchema = z.object({
  include_layout_previews: z.boolean().optional(),
  include_variations: z.boolean().optional(),
  generation_mode: z.string().optional(),
});

// ============================================================================
// GENERATION INPUT SCHEMA (PRIMARY)
// ============================================================================

export const GenerationInputSchema = z.object({
  summary: SummarySchema,
  knowledge_level: KnowledgeLevelSchema,
  user_preferences: UserPreferencesSchema.optional(),
  tags: z.array(z.string()).min(1, "At least one tag is required"),
  arxiv_id: z.string().min(1, "ArXiv ID is required"),
  options: GenerationOptionsSchema.optional(),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type ValidatedGenerationInput = z.infer<typeof GenerationInputSchema>;
export type ValidatedSummary = z.infer<typeof SummarySchema>;
export type ValidatedConcept = z.infer<typeof ConceptSchema>;
export type ValidatedUserPreferences = z.infer<typeof UserPreferencesSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a GenerationInput object and returns typed result
 */
export function validateGenerationInput(data: unknown): {
  success: true;
  data: GenerationInput;
} | {
  success: false;
  errors: string[];
} {
  const result = GenerationInputSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data as GenerationInput,
    };
  } else {
    return {
      success: false,
      errors: result.error.issues.map((err: any) => `${err.path.join(".")}: ${err.message}`),
    };
  }
}

/**
 * Validates and throws on error
 */
export function strictValidateGenerationInput(data: unknown): GenerationInput {
  return GenerationInputSchema.parse(data) as GenerationInput;
}
