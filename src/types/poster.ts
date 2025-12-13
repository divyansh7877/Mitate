/**
 * Type definitions for Poster Generation System
 */

// ============================================================================
// INPUT TYPES (From Friend's System)
// ============================================================================

export interface Concept {
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
  background?: string; // e.g., "biology", "computer science"
  preferred_colors?: string[];
  style_preference?: "minimalist" | "detailed" | "academic";
}

export type KnowledgeLevel = "beginner" | "intermediate" | "advanced";

export interface GenerationInput {
  summary: Summary;
  knowledge_level: KnowledgeLevel;
  user_preferences?: UserPreferences;
  tags: string[]; // e.g., ["visual", "mathematical", "conceptual"]
  arxiv_id: string;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  // Placeholder for future options
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export type GenerationStatus =
  | "pending"
  | "generating_layout"
  | "generating_final"
  | "complete"
  | "failed";

export interface GenerationOutput {
  request_id: string;
  status: GenerationStatus;
  final_image_url?: string;
  metadata: GenerationMetadata;
  error?: string;
}

export interface GenerationMetadata {
  generation_time_ms: number;
  fibo_seed?: number;
  fibo_prompt?: FiboStructuredPrompt;
  knowledge_level: KnowledgeLevel;
  timestamp: string;
}

// ============================================================================
// FIBO TYPES (Structured Prompt)
// ============================================================================

export interface FiboObject {
  description: string;
  location: string;
  relationship: string;
  relative_size: string;
  shape_and_color: string;
  texture: string;
  appearance_details: string;
  orientation: string;
}

export interface FiboLighting {
  conditions: string;
  direction: string;
  shadows: string;
}

export interface FiboAesthetics {
  composition: string;
  color_scheme: string;
  mood_atmosphere: string;
  preference_score: "low" | "medium" | "high" | "very high";
  aesthetic_score: "low" | "medium" | "high" | "very high";
}

export interface FiboPhotographicCharacteristics {
  depth_of_field: string;
  focus: string;
  camera_angle: string;
  lens_focal_length: string;
}

export interface FiboTextRender {
  text: string;
  location: string;
  size: string;
  color: string;
  font: string;
  appearance_details: string;
}

export interface FiboStructuredPrompt {
  short_description: string;
  objects: FiboObject[];
  background_setting: string;
  lighting: FiboLighting;
  aesthetics: FiboAesthetics;
  photographic_characteristics: FiboPhotographicCharacteristics;
  style_medium: string;
  text_render: FiboTextRender[];
  context: string;
  artistic_style: string;
}

export interface FiboGenerationRequest {
  structured_prompt: FiboStructuredPrompt;
  seed?: number;
  image_size?: { width: number; height: number };
}

export interface FiboGenerationResponse {
  request_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  status_url?: string;
  image_url?: string;
  generation_time_ms?: number;
  error?: string;
}

// ============================================================================
// LAYOUT TYPES
// ============================================================================

export type LayoutType = "vertical_flow" | "grid" | "f_pattern" | "z_pattern" | "academic";

export interface LayoutSection {
  height_percentage: number;
  position: { x: string; y: string };
  content_type: "header" | "concept" | "diagram" | "footer" | "connector";
}

export interface LayoutStrategy {
  type: LayoutType;
  sections: LayoutSection[];
  margins: { top: number; right: number; bottom: number; left: number };
  spacing: number;
  grid_columns?: number;
  grid_rows?: number;
}

// ============================================================================
// STYLE TYPES
// ============================================================================

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  light?: string;
  dark?: string;
}

export interface Typography {
  titleFont: string;
  headingFont: string;
  bodyFont: string;
  titleSize: string;
  subtitleSize: string;
  headingSize: string;
  bodySize: string;
  calloutSize: string;
  captionSize: string;
  headingColor: string;
  bodyColor: string;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface PosterGenerationDocument {
  id: string;
  request_id: string;
  status: GenerationStatus;
  input_summary: Summary;
  knowledge_level: KnowledgeLevel;
  fibo_structured_prompt?: FiboStructuredPrompt;
  fibo_seed?: number;
  final_image_url?: string;
  generation_time_ms?: number;
  user_preferences?: UserPreferences;
  error?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PromptBuilderConfig {
  max_text_length: number;
  max_objects: number;
  enable_icons: boolean;
  enable_connectors: boolean;
}

export interface GenerationCache {
  key: string;
  value: any;
  timestamp: number;
  ttl_seconds: number;
}
