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
import { downloadImage, downloadImages, generatePosterFilename } from "../utils/imageDownloader";

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
   * Supports both single-image and modular generation modes
   */
  async generate(input: GenerationInput): Promise<GenerationOutput> {
    // Check if modular generation is requested
    if (input.options?.generation_mode === "modular") {
      return this.generateModular(input);
    }

    // Default: single-image generation
    return this.generateSingleImage(input);
  }

  /**
   * Generate poster as a single image (original method)
   */
  private async generateSingleImage(input: GenerationInput): Promise<GenerationOutput> {
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

      // Download and save the image
      const filename = generatePosterFilename(requestId, 'single');
      console.log(`[${requestId}] Downloading image to output folder...`);

      const downloadResult = await downloadImage(
        fiboResult.image_url,
        `${filename}.png`,
        './output'
      );

      if (downloadResult.success) {
        console.log(`[${requestId}] ✓ Image saved to: ${downloadResult.localPath}`);
      } else {
        console.warn(`[${requestId}] ✗ Failed to save image locally: ${downloadResult.error}`);
      }

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
          local_path: downloadResult.localPath,
        } as any,
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
   * Generate poster in modular sections (header, concepts, footer)
   * Each section is generated separately for better text quality and less crowding
   */
  private async generateModular(input: GenerationInput): Promise<GenerationOutput> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    console.log(`[${requestId}] Starting MODULAR poster generation`);
    console.log(`[${requestId}] Will generate ${input.summary.key_concepts.length + 2} sections (header + ${input.summary.key_concepts.length} concepts + footer)`);
    console.log(`[${requestId}] Knowledge level: ${input.knowledge_level}`);

    try {
      const layout = this.layoutEngine.calculateLayout(
        input.summary.key_concepts.length,
        input.knowledge_level,
        input.tags
      );

      console.log(`[${requestId}] Layout calculated: ${layout.type}`);

      const sectionImages: string[] = [];
      const fiboSeed = Math.floor(Math.random() * 1000000);

      // Generate header section
      console.log(`[${requestId}] Generating header section...`);
      const headerPrompt = this.promptBuilder.buildHeaderSection(input, layout);
      const headerValidation = this.fiboService.validateStructuredPrompt(headerPrompt);
      if (!headerValidation.valid) {
        throw new Error(`Invalid header prompt: ${headerValidation.errors.join(", ")}`);
      }

      const headerResult = await this.fiboService.generatePoster({
        structured_prompt: headerPrompt,
        seed: fiboSeed,
        image_size: { width: 1600, height: 300 }, // Wide but short for header
      });

      if (headerResult.image_url) {
        sectionImages.push(headerResult.image_url);
        console.log(`[${requestId}] Header section generated ✓`);
      }

      // Generate each concept section
      for (let i = 0; i < input.summary.key_concepts.length; i++) {
        console.log(`[${requestId}] Generating concept ${i + 1}/${input.summary.key_concepts.length}...`);

        const conceptPrompt = this.promptBuilder.buildConceptSection(
          input.summary.key_concepts[i],
          i,
          input.knowledge_level,
          layout
        );

        const conceptValidation = this.fiboService.validateStructuredPrompt(conceptPrompt);
        if (!conceptValidation.valid) {
          console.warn(`[${requestId}] Skipping concept ${i + 1}: ${conceptValidation.errors.join(", ")}`);
          continue;
        }

        const conceptResult = await this.fiboService.generatePoster({
          structured_prompt: conceptPrompt,
          seed: fiboSeed + i + 1,
          image_size: { width: 1600, height: 400 }, // Wide format for better text visibility
        });

        if (conceptResult.image_url) {
          sectionImages.push(conceptResult.image_url);
          console.log(`[${requestId}] Concept ${i + 1} generated ✓`);
        }
      }

      // Generate footer section
      console.log(`[${requestId}] Generating footer section...`);
      const footerPrompt = this.promptBuilder.buildFooterSection(input, layout);
      const footerValidation = this.fiboService.validateStructuredPrompt(footerPrompt);
      if (!footerValidation.valid) {
        throw new Error(`Invalid footer prompt: ${footerValidation.errors.join(", ")}`);
      }

      const footerResult = await this.fiboService.generatePoster({
        structured_prompt: footerPrompt,
        seed: fiboSeed + 1000,
        image_size: { width: 1600, height: 200 }, // Wide but short for footer
      });

      if (footerResult.image_url) {
        sectionImages.push(footerResult.image_url);
        console.log(`[${requestId}] Footer section generated ✓`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`[${requestId}] All sections generated successfully in ${totalTime}ms`);
      console.log(`[${requestId}] Section URLs: ${sectionImages.length} images ready for composition`);

      // Download and save all section images
      const filename = generatePosterFilename(requestId, 'modular');
      console.log(`[${requestId}] Downloading ${sectionImages.length} section images to output folder...`);

      const downloadResults = await downloadImages(
        sectionImages,
        filename,
        './output'
      );

      const localPaths = downloadResults
        .filter(r => r.success)
        .map(r => r.localPath);

      console.log(`[${requestId}] ✓ Saved ${localPaths.length}/${sectionImages.length} sections locally`);

      return {
        request_id: requestId,
        status: "complete",
        final_image_url: sectionImages[0], // Return first section URL (or could return JSON array)
        metadata: {
          generation_time_ms: totalTime,
          fibo_seed: fiboSeed,
          knowledge_level: input.knowledge_level,
          timestamp: new Date().toISOString(),
          section_urls: sectionImages, // Store all section URLs for composition
          local_paths: localPaths, // Store local file paths
        } as any,
      };
    } catch (error) {
      console.error(`[${requestId}] Modular generation failed:`, error);

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
