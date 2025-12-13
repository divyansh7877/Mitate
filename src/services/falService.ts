/**
 * FAL.AI Service
 * Handles rapid prototyping, icon generation, and style variations
 */

import * as fal from "@fal-ai/serverless-client";
import type {
  Concept,
  KnowledgeLevel,
  FalLayoutPreviewRequest,
  FalIconGenerationRequest,
  FalVariationRequest,
  FalGenerationResponse,
  StyleVariation,
} from "../types/poster";

export class FalService {
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("FAL API key is required");
    }
    fal.config({ credentials: apiKey });
  }

  /**
   * Generate layout wireframe previews using ControlNet
   * Fast previews to validate composition before expensive FIBO generation
   */
  async generateLayoutPreviews(
    request: FalLayoutPreviewRequest
  ): Promise<string[]> {
    try {
      const layoutGuideUrl = await this.createLayoutGuide(
        request.concepts.length,
        request.knowledge_level
      );

      const prompt = this.buildLayoutPrompt(
        request.concepts,
        request.knowledge_level
      );

      const result = await fal.subscribe("fal-ai/fast-sdxl", {
        prompt: prompt,
        negative_prompt:
          "text, words, letters, watermark, blurry, low quality, photorealistic",
        num_inference_steps: 25,
        guidance_scale: 7.5,
        num_images: request.num_variations || 3,
        image_size: "square",
        seed: Math.floor(Math.random() * 1000000),
      });

      return (result as FalGenerationResponse).images.map((img) => img.url);
    } catch (error) {
      console.error("FAL layout preview generation error:", error);
      throw error;
    }
  }

  /**
   * Generate icons for visual metaphors
   * Creates consistent icon sets for each concept's visual metaphor
   */
  async generateIcons(
    request: FalIconGenerationRequest
  ): Promise<string[]> {
    try {
      const iconPromises = request.visual_metaphors.map((metaphor) =>
        this.generateSingleIcon(metaphor, request.style)
      );

      const results = await Promise.all(iconPromises);
      return results;
    } catch (error) {
      console.error("FAL icon generation error:", error);
      throw error;
    }
  }

  /**
   * Generate a single icon for a visual metaphor
   */
  private async generateSingleIcon(
    metaphor: string,
    style: "flat" | "isometric" | "3d"
  ): Promise<string> {
    const styleDescriptor = {
      flat: "flat design, simple, minimalist, vector style, single color",
      isometric: "isometric view, clean lines, geometric, modern",
      "3d": "3D render, smooth shading, clean background, professional",
    }[style];

    const prompt = `${metaphor}, ${styleDescriptor}, icon, clean background, centered, high quality`;

    const result = await fal.subscribe("fal-ai/fast-sdxl", {
      prompt: prompt,
      negative_prompt: "text, words, complex background, photorealistic, messy",
      num_inference_steps: 25,
      guidance_scale: 7.5,
      num_images: 1,
      image_size: "square_hd",
    });

    return (result as FalGenerationResponse).images[0].url;
  }

  /**
   * Generate style variations of a finished poster
   * Allows users to see different color schemes and styles quickly
   */
  async generateStyleVariations(
    request: FalVariationRequest
  ): Promise<StyleVariation[]> {
    try {
      const variationPromises = request.variations.map(
        async ({ name, prompt, strength }) => {
          const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
            image_url: request.base_image_url,
            prompt: prompt,
            strength: strength || 0.35, // Light transformation to preserve layout
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
          });

          return {
            name,
            description: prompt,
            url: (result as FalGenerationResponse).images[0].url,
          };
        }
      );

      return Promise.all(variationPromises);
    } catch (error) {
      console.error("FAL style variation error:", error);
      throw error;
    }
  }

  /**
   * Quick poster generation using FAL (alternative to FIBO for speed)
   * Useful for rapid prototyping or when FIBO is unavailable
   */
  async generateQuickPoster(
    title: string,
    concepts: Concept[],
    knowledgeLevel: KnowledgeLevel,
    finding: string
  ): Promise<string> {
    try {
      const prompt = this.buildQuickPosterPrompt(
        title,
        concepts,
        knowledgeLevel,
        finding
      );

      const result = await fal.subscribe("fal-ai/flux-pro", {
        prompt: prompt,
        image_size: {
          width: 1024,
          height: 1024,
        },
        num_inference_steps: 30,
        guidance_scale: 4.0,
        num_images: 1,
      });

      return (result as FalGenerationResponse).images[0].url;
    } catch (error) {
      console.error("FAL quick poster generation error:", error);
      throw error;
    }
  }

  /**
   * Build layout prompt for wireframe generation
   */
  private buildLayoutPrompt(
    concepts: Concept[],
    knowledgeLevel: KnowledgeLevel
  ): string {
    const styleMap = {
      beginner: "friendly, colorful, simple illustrations, large sections",
      intermediate: "professional, clean design, technical diagrams",
      advanced: "academic, dense information, mathematical notation",
    };

    return `
      Clean modern infographic layout wireframe,
      ${concepts.length} main sections,
      vertical flow design,
      ${styleMap[knowledgeLevel]},
      minimalist,
      white background,
      clear hierarchy,
      no text or words
    `.trim();
  }

  /**
   * Build prompt for quick poster generation
   */
  private buildQuickPosterPrompt(
    title: string,
    concepts: Concept[],
    knowledgeLevel: KnowledgeLevel,
    finding: string
  ): string {
    const styleMap = {
      beginner:
        "friendly and colorful with simple illustrations, easy to understand, visual metaphors",
      intermediate:
        "professional with technical diagrams, clean design, practical examples",
      advanced:
        "academic style with mathematical notation, dense information, scholarly appearance",
    };

    const colorMap = {
      beginner: "bright blues, greens, and oranges",
      intermediate: "professional blues and teals",
      advanced: "muted academic colors, dark blues and grays",
    };

    return `
Educational infographic poster titled "${title}".

Main concepts to visualize:
${concepts.map((c, i) => `${i + 1}. ${c.name}: ${c.explanation} (visual: ${c.visual_metaphor})`).join("\n")}

Key finding: ${finding}

Style: ${styleMap[knowledgeLevel]}
Layout: Vertical flow with clear sections and numbered concepts
Color scheme: ${colorMap[knowledgeLevel]}
Typography: Modern sans-serif, clear hierarchy with title, section headers, and body text
Background: Clean white or light gradient
Overall: Professional, educational, shareable on social media

Include visual representations of each concept, clear section divisions, and the key finding highlighted at the bottom.
    `.trim();
  }

  /**
   * Create a layout guide image for ControlNet
   * In production, this would use Canvas or sharp to draw rectangles
   * For now, returns a conceptual implementation
   */
  private async createLayoutGuide(
    numSections: number,
    knowledgeLevel: KnowledgeLevel
  ): Promise<string> {
    // TODO: Implement actual canvas-based layout guide generation
    // This would create a simple image with rectangles showing the layout structure

    // For now, we skip ControlNet and use direct generation
    // In production, you would:
    // 1. Create a canvas (1024x1024)
    // 2. Draw header rectangle (top 15%)
    // 3. Draw concept rectangles (divided middle section)
    // 4. Draw footer rectangle (bottom 10%)
    // 5. Save as base64 or upload to temporary storage
    // 6. Return the URL

    return ""; // Placeholder
  }

  /**
   * Get preset style variations
   */
  getPresetVariations(): Array<{ name: string; prompt: string }> {
    return [
      {
        name: "Vibrant",
        prompt:
          "Same layout and content, but with vibrant, saturated colors, energetic feel",
      },
      {
        name: "Dark Mode",
        prompt:
          "Same layout and content, but with dark background, light text, night mode style",
      },
      {
        name: "Pastel",
        prompt:
          "Same layout and content, but with soft pastel colors, gentle and calming",
      },
      {
        name: "High Contrast",
        prompt:
          "Same layout and content, but with high contrast black and white with single accent color",
      },
      {
        name: "Gradient",
        prompt:
          "Same layout and content, but with beautiful gradient backgrounds, modern and stylish",
      },
    ];
  }

  /**
   * Test connection to FAL API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a minimal generation to test the API
      const result = await fal.subscribe("fal-ai/fast-sdxl", {
        prompt: "test",
        num_inference_steps: 1,
        num_images: 1,
        image_size: "square",
      });
      return !!(result as FalGenerationResponse).images?.[0];
    } catch (error) {
      console.error("FAL connection test failed:", error);
      return false;
    }
  }
}

/**
 * Create a FAL service instance from environment variables
 */
export function createFalService(): FalService {
  const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;

  if (!apiKey) {
    throw new Error("FAL_KEY or FAL_API_KEY environment variable is required");
  }

  return new FalService(apiKey);
}
