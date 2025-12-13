/**
 * Poster Generation Orchestrator with Full Output Saving
 * Saves all outputs at each execution layer
 */

import type { GenerationInput, GenerationOutput, LayoutStrategy } from "../types/poster";
import { FiboService } from "./fiboService";
import { FiboStructuredPromptBuilder } from "./fiboPromptBuilder";
import { LayoutEngine } from "./layoutEngine";
import { downloadImage } from "../utils/imageDownloader";
import { OutputSaver } from "../utils/outputSaver";

export class PosterGenerationOrchestratorWithSaving {
  private fiboService: FiboService;
  private promptBuilder: FiboStructuredPromptBuilder;
  private layoutEngine: LayoutEngine;
  private outputSaver?: OutputSaver;

  constructor(fiboService: FiboService, outputSaver?: OutputSaver) {
    this.fiboService = fiboService;
    this.promptBuilder = new FiboStructuredPromptBuilder();
    this.layoutEngine = new LayoutEngine();
    this.outputSaver = outputSaver;
  }

  async generate(input: GenerationInput): Promise<GenerationOutput> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}`;

    console.log(`\n[${requestId}] Starting poster generation`);
    console.log(`[${requestId}] Knowledge level: ${input.knowledge_level}`);
    console.log(`[${requestId}] Output saving: ${this.outputSaver ? "Enabled" : "Disabled"}`);

    try {
      // ==================================================
      // LAYER 3: LAYOUT CALCULATION
      // ==================================================
      console.log(`[${requestId}] Calculating layout...`);

      const numConcepts = input.summary.key_concepts.length;
      const layout = this.layoutEngine.calculateLayout(
        numConcepts,
        input.knowledge_level,
        input.tags
      );

      console.log(`[${requestId}] Calculated layout: ${layout.type}`);

      // Get alternatives for comparison
      const alternatives = this.getAlternativeLayouts(numConcepts, input.knowledge_level, input.tags);

      // Save layout layer
      if (this.outputSaver) {
        this.outputSaver.saveLayout({
          input: {
            numConcepts,
            knowledgeLevel: input.knowledge_level,
            tags: input.tags,
          },
          selectedLayout: layout,
          alternativeLayouts: alternatives,
          calculations: {
            sectionsCount: layout.sections.length,
            totalHeight: layout.sections.reduce((sum, s) => sum + s.height_percentage, 0),
            margins: layout.margins,
            spacing: layout.spacing,
          },
        });
        console.log(`[${requestId}] ✓ Saved layout to: ${this.outputSaver.getRequestDir()}/3-layout/`);
      }

      // ==================================================
      // LAYER 4: FIBO PROMPT BUILDING
      // ==================================================
      console.log(`[${requestId}] Building FIBO structured prompt...`);

      const fiboPrompt = this.promptBuilder.build(input, layout);

      // Extract components for detailed saving
      const components = {
        shortDescription: fiboPrompt.short_description,
        objects: fiboPrompt.objects,
        textElements: fiboPrompt.text_render,
        background: fiboPrompt.background_setting,
        lighting: fiboPrompt.lighting,
        aesthetics: fiboPrompt.aesthetics,
        typography: (this.promptBuilder as any).selectTypography(input.knowledge_level),
        colorScheme: (this.promptBuilder as any).selectColorScheme(input.knowledge_level),
      };

      // Validate prompt
      const validation = this.fiboService.validateStructuredPrompt(fiboPrompt);
      console.log(`[${requestId}] Validating prompt: ${validation.valid ? "✓ Valid" : "✗ Invalid"}`);

      if (!validation.valid) {
        console.warn(`[${requestId}] Validation warnings:`, validation.errors);
      }

      // Save prompt building layer
      if (this.outputSaver) {
        this.outputSaver.savePromptBuilding({
          generationInput: input,
          layoutStrategy: layout,
          fiboPrompt,
          components,
          validation,
        });
        console.log(`[${requestId}] ✓ Saved prompt to: ${this.outputSaver.getRequestDir()}/4-prompt/`);
      }

      // ==================================================
      // LAYER 5: FIBO GENERATION
      // ==================================================
      console.log(`[${requestId}] Calling FIBO API...`);

      const seed = Math.floor(Math.random() * 1000000);
      const fiboRequest = {
        structured_prompt: fiboPrompt,
        seed,
        image_size: { width: 1600, height: 2400 },
      };

      const pollingLog: Array<{
        attempt: number;
        status: string;
        timestamp: string;
      }> = [];

      // Generate (FIBO API is synchronous in current implementation)
      const fiboResponse = await this.fiboService.generatePoster(fiboRequest);

      pollingLog.push({
        attempt: 1,
        status: fiboResponse.status,
        timestamp: new Date().toISOString(),
      });

      const generationTime = Date.now() - startTime;

      if (fiboResponse.status === "completed" && fiboResponse.image_url) {
        console.log(`[${requestId}] ✓ Image generated: ${fiboResponse.image_url}`);

        // Save generation layer
        if (this.outputSaver) {
          this.outputSaver.saveGeneration({
            request: fiboRequest,
            response: fiboResponse,
            pollingAttempts: pollingLog.length,
            pollingLog,
            imageUrl: fiboResponse.image_url,
            generationTimeMs: generationTime,
          });
          console.log(`[${requestId}] ✓ Saved generation to: ${this.outputSaver.getRequestDir()}/5-generation/`);
        }

        // ==================================================
        // LAYER 6: DOWNLOAD & FINAL
        // ==================================================
        console.log(`[${requestId}] Downloading image...`);

        const filename = `poster_${requestId}_${Date.now()}.png`;
        const downloadResult = await downloadImage(fiboResponse.image_url, filename);

        console.log(`[${requestId}] ✓ Saved: ${downloadResult.localPath || 'unknown'}`);

        const finalMetadata = {
          generation_time_ms: generationTime,
          fibo_seed: seed,
          fibo_prompt: fiboPrompt,
          knowledge_level: input.knowledge_level,
          timestamp: new Date().toISOString(),
        };

        // Save final layer
        if (this.outputSaver) {
          this.outputSaver.saveFinal({
            imageUrl: fiboResponse.image_url,
            localPath: downloadResult.localPath,
            metadata: finalMetadata,
            totalTimeMs: generationTime,
            allLayers: {
              input,
              layout,
              prompt: fiboPrompt,
              generation: fiboResponse,
              download: downloadResult,
            },
          });

          // Generate execution report
          const reportPath = this.outputSaver.generateReport();
          console.log(`[${requestId}] ✓ Saved final outputs to: ${this.outputSaver.getRequestDir()}/6-final/`);
          console.log(`[${requestId}] ✓ Generated report: ${reportPath}`);
        }

        return {
          request_id: requestId,
          status: "complete",
          final_image_url: fiboResponse.image_url,
          metadata: finalMetadata,
        };
      } else {
        const error = `FIBO generation failed: ${fiboResponse.status}`;
        console.error(`[${requestId}] ✗ ${error}`);

        // Save generation error
        if (this.outputSaver) {
          this.outputSaver.saveError("5-generation", new Error(error), {
            request: fiboRequest,
            response: fiboResponse,
          });
        }

        return {
          request_id: requestId,
          status: "failed",
          metadata: {
            generation_time_ms: generationTime,
            fibo_seed: seed,
            knowledge_level: input.knowledge_level,
            timestamp: new Date().toISOString(),
          },
          error,
        };
      }
    } catch (error) {
      console.error(`[${requestId}] ✗ Generation failed:`, error);

      // Save error at appropriate layer
      if (this.outputSaver) {
        this.outputSaver.saveError("6-final", error as Error, { input });
      }

      return {
        request_id: requestId,
        status: "failed",
        metadata: {
          generation_time_ms: Date.now() - startTime,
          knowledge_level: input.knowledge_level,
          timestamp: new Date().toISOString(),
        },
        error: (error as Error).message,
      };
    }
  }

  private getAlternativeLayouts(
    numConcepts: number,
    knowledgeLevel: string,
    tags: string[]
  ): LayoutStrategy[] {
    const alternatives: LayoutStrategy[] = [];

    // Try each layout type
    const types = ["vertical_flow", "grid", "f_pattern", "academic"] as const;

    types.forEach((type) => {
      try {
        // This is a simplified version - you'd need to expose layout calculation methods
        const layout = this.layoutEngine.calculateLayout(numConcepts, knowledgeLevel as any, tags);
        if (layout.type !== type) {
          // Force the type for comparison (this is illustrative)
          alternatives.push({ ...layout, type });
        }
      } catch (error) {
        // Skip invalid layouts
      }
    });

    return alternatives;
  }

  async testServices(): Promise<boolean> {
    console.log("Testing FIBO service...");
    return await this.fiboService.testConnection();
  }
}

export function createPosterGenerationOrchestratorWithSaving(
  fiboService: FiboService,
  outputSaver?: OutputSaver
): PosterGenerationOrchestratorWithSaving {
  return new PosterGenerationOrchestratorWithSaving(fiboService, outputSaver);
}
