/**
 * Poster Generation Orchestrator
 * Coordinates FIBO, Layout Engine, and Prompt Builder to generate posters
 */

import { LayoutEngine } from "./layoutEngine.js";
import { FiboStructuredPromptBuilder } from "./fiboPromptBuilder.js";
import { downloadAndUploadImage } from "../utils/imageHandler.js";

export class PosterGenerationOrchestrator {
    /**
     * @param {import("./fiboService").FiboService} fiboService
     * @param {import("node-appwrite").Storage} storage
     * @param {string} bucketId
     * @param {LayoutEngine} layoutEngine
     * @param {FiboStructuredPromptBuilder} promptBuilder
     */
    constructor(
        fiboService,
        storage,
        bucketId,
        layoutEngine,
        promptBuilder
    ) {
        this.fiboService = fiboService;
        this.storage = storage;
        this.bucketId = bucketId;
        this.layoutEngine = layoutEngine || new LayoutEngine();
        this.promptBuilder = promptBuilder || new FiboStructuredPromptBuilder();
    }

    /**
     * Generate a poster from research paper summary
     * Supports both single-image and modular generation modes
     */
    async generate(input) {
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
    async generateSingleImage(input) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        console.log(`[${requestId}] Starting poster generation`);
        console.log(`[${requestId}] Knowledge level: ${input.knowledge_level}`);
        console.log(`[${requestId}] Concepts: ${input.summary.key_concepts.length}`);

        try {
            // Stage 1: Layout Planning
            console.log(`[${requestId}] generating_layout`);

            const layout = this.layoutEngine.calculateLayout(
                input.summary.key_concepts.length,
                input.knowledge_level,
                input.tags || []
            );

            console.log(`[${requestId}] Layout calculated: ${layout.type}`);

            // Stage 2: Build FIBO structured prompt
            console.log(`[${requestId}] generating_final`);

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

            // Upload to Appwrite Storage
            const filename = `${requestId}_single.png`;
            console.log(`[${requestId}] Uploading image to storage...`);

            let storageFileId = null;
            try {
                storageFileId = await downloadAndUploadImage(
                    fiboResult.image_url,
                    this.bucketId,
                    filename,
                    this.storage
                );
                console.log(`[${requestId}] ✓ Image uploaded: ${storageFileId}`);
            } catch (err) {
                console.warn(`[${requestId}] ✗ Failed to upload image: ${err.message}`);
            }

            // Complete
            const totalTime = Date.now() - startTime;
            console.log(`[${requestId}] Total generation time: ${totalTime}ms`);

            return {
                request_id: requestId,
                status: "complete",
                final_image_url: fiboResult.image_url, // Return FIBO URL (will expire)
                storage_file_id: storageFileId, // Return Appwrite File ID
                metadata: {
                    generation_time_ms: totalTime,
                    fibo_seed: fiboSeed,
                    fibo_prompt: structuredPrompt,
                    knowledge_level: input.knowledge_level,
                    timestamp: new Date().toISOString(),
                    storage_file_id: storageFileId
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
     * Generate poster in modular sections (header, concepts, footer)
     * Each section is generated separately for better text quality and less crowding
     */
    async generateModular(input) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();

        console.log(`[${requestId}] Starting MODULAR poster generation`);
        console.log(`[${requestId}] Will generate ${input.summary.key_concepts.length + 2} sections (header + ${input.summary.key_concepts.length} concepts + footer)`);
        console.log(`[${requestId}] Knowledge level: ${input.knowledge_level}`);

        try {
            const layout = this.layoutEngine.calculateLayout(
                input.summary.key_concepts.length,
                input.knowledge_level,
                input.tags || []
            );

            console.log(`[${requestId}] Layout calculated: ${layout.type}`);

            const sectionImages = [];
            const storageFileIds = [];
            const fiboSeed = Math.floor(Math.random() * 1000000);

            // Helper to process section result
            const processSection = async (result, index, type) => {
                if (result.image_url) {
                    sectionImages.push(result.image_url);
                    console.log(`[${requestId}] ${type} section generated ✓`);

                    // Upload
                    const filename = `${requestId}_${type}_${index}.png`;
                    try {
                        const fileId = await downloadAndUploadImage(
                            result.image_url,
                            this.bucketId,
                            filename,
                            this.storage
                        );
                        storageFileIds.push(fileId);
                    } catch (err) {
                        console.warn(`Failed to upload section ${type}: ${err.message}`);
                        // Push null to keep index alignment if needed, or just skip
                        storageFileIds.push(null);
                    }
                }
            };

            // Generate header section
            console.log(`[${requestId}] Generating header section...`);
            const headerPrompt = this.promptBuilder.buildHeaderSection(input, layout);

            const headerResult = await this.fiboService.generatePoster({
                structured_prompt: headerPrompt,
                seed: fiboSeed,
                image_size: { width: 1600, height: 300 }, // Wide but short for header
            });
            await processSection(headerResult, 0, 'header');

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
                await processSection(conceptResult, i + 1, 'concept');
            }

            // Generate footer section
            console.log(`[${requestId}] Generating footer section...`);
            const footerPrompt = this.promptBuilder.buildFooterSection(input, layout);

            const footerResult = await this.fiboService.generatePoster({
                structured_prompt: footerPrompt,
                seed: fiboSeed + 1000,
                image_size: { width: 1600, height: 200 }, // Wide but short for footer
            });
            await processSection(footerResult, 99, 'footer');

            const totalTime = Date.now() - startTime;
            console.log(`[${requestId}] All sections generated successfully in ${totalTime}ms`);

            return {
                request_id: requestId,
                status: "complete",
                final_image_url: sectionImages[0], // Return first section URL (or could return JSON array)
                storage_file_id: storageFileIds[0], // First file ID
                metadata: {
                    generation_time_ms: totalTime,
                    fibo_seed: fiboSeed,
                    knowledge_level: input.knowledge_level,
                    timestamp: new Date().toISOString(),
                    section_urls: sectionImages, // Store all section URLs
                    section_file_ids: storageFileIds // Store all file IDs
                },
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
     * Generate a unique request ID
     */
    generateRequestId() {
        return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Create an orchestrator instance
 */
export function createPosterGenerationOrchestrator(
    fiboService,
    storage,
    bucketId
) {
    return new PosterGenerationOrchestrator(fiboService, storage, bucketId);
}
