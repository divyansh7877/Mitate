/**
 * Poster Generation Orchestrator
 * Coordinates FIBO, Layout Engine, and Prompt Builder to generate posters
 */

import type {
  GenerationInput,
  GenerationOutput,
  GenerationStatus,
} from "../types/poster";
import { FiboService } from "./fiboService";
import { LayoutEngine } from "./layoutEngine";
import { FiboStructuredPromptBuilder } from "./fiboPromptBuilder";

export class PosterGenerationOrchestrator {
  private fiboService: FiboService;
  private layoutEngine: LayoutEngine;
  private promptBuilder: FiboStructuredPromptBuilder;

  constructor(
    fiboService: FiboService,
    layoutEngine?: LayoutEngine,
    promptBuilder?: FiboStructuredPromptBuilder
  ) {
    this.fiboService = fiboService;
    this.layoutEngine = layoutEngine || new LayoutEngine();
    this.promptBuilder = promptBuilder || new FiboStructuredPromptBuilder();
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

      // Stage 2: Build FIBO structured prompt
      const status2: GenerationStatus = "generating_final";
      console.log(`[${requestId}] ${status2}`);

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

      // Complete
      const totalTime = Date.now() - startTime;
      console.log(`[${requestId}] Total generation time: ${totalTime}ms`);

      return {
        request_id: requestId,
        status: "complete",
        final_image_url: fiboResult.image_url,
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
   * Test FIBO service
   */
  async testServices(): Promise<{
    fibo: boolean;
    overall: boolean;
  }> {
    console.log("Testing services...");

    const fiboOk = await this.fiboService.testConnection();

    console.log(`FIBO service: ${fiboOk ? "✓" : "✗"}`);

    return {
      fibo: fiboOk,
      overall: fiboOk,
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
 * Create an orchestrator instance with FIBO service
 */
export function createPosterGenerationOrchestrator(
  fiboService: FiboService
): PosterGenerationOrchestrator {
  return new PosterGenerationOrchestrator(fiboService);
}
