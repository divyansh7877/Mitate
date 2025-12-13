/**
 * Poster Generation Orchestrator
 * Coordinates FAL, FIBO, Layout Engine, and Prompt Builder to generate posters
 */

import type {
  GenerationInput,
  GenerationOutput,
  GenerationStatus,
  StyleVariation,
} from "../types/poster";
import { FiboService } from "./fiboService";
import { FalService } from "./falService";
import { LayoutEngine } from "./layoutEngine";
import { FiboStructuredPromptBuilder } from "./fiboPromptBuilder";

export class PosterGenerationOrchestrator {
  private fiboService: FiboService;
  private falService: FalService;
  private layoutEngine: LayoutEngine;
  private promptBuilder: FiboStructuredPromptBuilder;

  constructor(
    fiboService: FiboService,
    falService: FalService,
    layoutEngine: LayoutEngine,
    promptBuilder: FiboStructuredPromptBuilder
  ) {
    this.fiboService = fiboService;
    this.falService = falService;
    this.layoutEngine = layoutEngine;
    this.promptBuilder = promptBuilder;
  }

  /**
   * Generate a poster from research paper summary
   */
  async generate(input: GenerationInput): Promise<GenerationOutput> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    console.log(`[${requestId}] Starting poster generation`);
    console.log(`[${requestId}] Knowledge level: ${input.knowledge_level}`);
    console.log(`[${requestId}] Concepts: ${input.summary.key_concepts.length}`);

    try {
      // Stage 1: Layout Planning
      const status1: GenerationStatus = "generating_layout";
      console.log(`[${requestId}] ${status1}`);

      const layout = this.layoutEngine.calculateLayout(
        input.summary.key_concepts.length,
        input.knowledge_level,
        input.tags
      );

      console.log(`[${requestId}] Layout calculated: ${layout.type}`);

      // Stage 2: Optional - Generate layout previews with FAL
      let layoutPreviews: string[] | undefined;

      if (input.options?.include_layout_previews) {
        try {
          layoutPreviews = await this.falService.generateLayoutPreviews({
            concepts: input.summary.key_concepts,
            knowledge_level: input.knowledge_level,
            num_variations: 3,
          });

          console.log(
            `[${requestId}] Generated ${layoutPreviews.length} layout previews`
          );
        } catch (error) {
          console.warn(
            `[${requestId}] Layout preview generation failed, continuing:`,
            error
          );
          // Continue without previews
        }
      }

      // Stage 3: Optional - Generate icons for visual metaphors with FAL
      const status2: GenerationStatus = "generating_icons";

      if (input.options?.generation_mode !== "fast") {
        console.log(`[${requestId}] ${status2}`);

        try {
          const visualMetaphors = input.summary.key_concepts.map(
            (c) => c.visual_metaphor
          );

          const icons = await this.falService.generateIcons({
            visual_metaphors: visualMetaphors,
            style: input.knowledge_level === "beginner" ? "flat" : "isometric",
          });

          console.log(`[${requestId}] Generated ${icons.length} icons`);
          // Icons could be used in the prompt builder, but for now we'll skip integration
        } catch (error) {
          console.warn(
            `[${requestId}] Icon generation failed, continuing:`,
            error
          );
        }
      }

      // Stage 4: Build FIBO structured prompt
      const status3: GenerationStatus = "generating_final";
      console.log(`[${requestId}] ${status3}`);

      const structuredPrompt = this.promptBuilder.build(input, layout);

      // Validate prompt
      const validation =
        this.fiboService.validateStructuredPrompt(structuredPrompt);
      if (!validation.valid) {
        throw new Error(
          `Invalid structured prompt: ${validation.errors.join(", ")}`
        );
      }

      console.log(
        `[${requestId}] Structured prompt built and validated successfully`
      );
      console.log(
        `[${requestId}] Estimated generation time: ${this.fiboService.estimateGenerationTime(structuredPrompt)}s`
      );

      // Stage 5: Generate final poster with FIBO
      const fiboSeed = Math.floor(Math.random() * 1000000);
      const fiboResult = await this.fiboService.generatePoster({
        structured_prompt: structuredPrompt,
        seed: fiboSeed,
        image_size: { width: 1024, height: 1024 },
      });

      if (!fiboResult.image_url) {
        throw new Error("FIBO generation completed but no image URL returned");
      }

      console.log(`[${requestId}] FIBO generation completed successfully`);

      // Stage 6: Optional - Generate style variations with FAL
      let variations: StyleVariation[] | undefined;

      if (input.options?.include_variations) {
        const status4: GenerationStatus = "generating_variations";
        console.log(`[${requestId}] ${status4}`);

        try {
          const presetVariations = this.falService.getPresetVariations();

          variations = await this.falService.generateStyleVariations({
            base_image_url: fiboResult.image_url,
            variations: presetVariations.slice(0, 3), // Generate 3 variations
          });

          console.log(`[${requestId}] Generated ${variations.length} variations`);
        } catch (error) {
          console.warn(
            `[${requestId}] Style variation generation failed:`,
            error
          );
          // Continue without variations
        }
      }

      // Complete
      const totalTime = Date.now() - startTime;
      console.log(`[${requestId}] Total generation time: ${totalTime}ms`);

      return {
        request_id: requestId,
        status: "complete",
        layout_previews: layoutPreviews,
        final_image_url: fiboResult.image_url,
        variations: variations,
        metadata: {
          generation_time_ms: totalTime,
          fibo_seed: fiboSeed,
          fibo_prompt: structuredPrompt,
          knowledge_level: input.knowledge_level,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`[${requestId}] Generation failed:`, error);

      return {
        request_id: requestId,
        status: "failed",
        metadata: {
          generation_time_ms: Date.now() - startTime,
          knowledge_level: input.knowledge_level,
          timestamp: new Date().toISOString(),
        },
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Generate a quick poster using only FAL (fallback or fast mode)
   */
  async generateFastMode(input: GenerationInput): Promise<GenerationOutput> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    console.log(`[${requestId}] Starting FAST mode poster generation with FAL`);

    try {
      const imageUrl = await this.falService.generateQuickPoster(
        input.summary.title,
        input.summary.key_concepts,
        input.knowledge_level,
        input.summary.key_finding
      );

      const totalTime = Date.now() - startTime;

      return {
        request_id: requestId,
        status: "complete",
        final_image_url: imageUrl,
        metadata: {
          generation_time_ms: totalTime,
          knowledge_level: input.knowledge_level,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`[${requestId}] Fast mode generation failed:`, error);

      return {
        request_id: requestId,
        status: "failed",
        metadata: {
          generation_time_ms: Date.now() - startTime,
          knowledge_level: input.knowledge_level,
          timestamp: new Date().toISOString(),
        },
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Regenerate with different knowledge level
   */
  async regenerate(
    originalInput: GenerationInput,
    newKnowledgeLevel: string
  ): Promise<GenerationOutput> {
    console.log(
      `Regenerating with knowledge level: ${newKnowledgeLevel} (was: ${originalInput.knowledge_level})`
    );

    return this.generate({
      ...originalInput,
      knowledge_level: newKnowledgeLevel as any,
    });
  }

  /**
   * Generate only style variations for an existing poster
   */
  async generateVariationsOnly(
    baseImageUrl: string
  ): Promise<StyleVariation[]> {
    console.log("Generating style variations for existing poster");

    const presetVariations = this.falService.getPresetVariations();

    return this.falService.generateStyleVariations({
      base_image_url: baseImageUrl,
      variations: presetVariations,
    });
  }

  /**
   * Test all services
   */
  async testServices(): Promise<{
    fibo: boolean;
    fal: boolean;
    overall: boolean;
  }> {
    console.log("Testing services...");

    const fiboOk = await this.fiboService.testConnection();
    const falOk = await this.falService.testConnection();

    console.log(`FIBO service: ${fiboOk ? "✓" : "✗"}`);
    console.log(`FAL service: ${falOk ? "✓" : "✗"}`);

    return {
      fibo: fiboOk,
      fal: falOk,
      overall: fiboOk && falOk,
    };
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create an orchestrator instance with default services
 */
export function createPosterGenerationOrchestrator(
  fiboService: FiboService,
  falService: FalService
): PosterGenerationOrchestrator {
  const layoutEngine = new LayoutEngine();
  const promptBuilder = new FiboStructuredPromptBuilder();

  return new PosterGenerationOrchestrator(
    fiboService,
    falService,
    layoutEngine,
    promptBuilder
  );
}
