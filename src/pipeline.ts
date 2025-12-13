import { createLLMService } from "./services/llmService";
import { createSummaryCompiler } from "./services/summaryCompiler";
import { createPosterGenerationOrchestrator } from "./services/posterGenerationOrchestrator";
import { createFiboService } from "./services/fiboService";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { GenerationInput } from "./schemas/generationInput.schema";

export interface PipelineInput {
    summaryText: string;
    userDetails: {
        knowledgeLevel: "beginner" | "intermediate" | "advanced";
        tags: string[];
        arxivId?: string;
    };
}

export interface PipelineResult {
    success: boolean;
    imageUrl?: string;
    outputPath?: string;
    error?: string;
    savedInputPath: string;
}

export async function generatePoster(input: PipelineInput): Promise<PipelineResult> {
    // 1. Save inputs to a random directory
    const randomDirName = crypto.randomUUID();
    const baseDir = path.join(process.cwd(), "random_input_dumps");
    const saveDir = path.join(baseDir, randomDirName);

    try {
        await fs.mkdir(saveDir, { recursive: true });
        await fs.writeFile(path.join(saveDir, "summary.txt"), input.summaryText);
        await fs.writeFile(path.join(saveDir, "details.json"), JSON.stringify(input.userDetails, null, 2));
        console.log(`Inputs saved to: ${saveDir}`);
    } catch (err) {
        console.warn("Failed to save inputs:", err);
        // Proceeding anyway as this is likely non-critical to the core pipeline, 
        // but the user asked for it, so we return the path even if empty/failed.
    }

    try {
        // 2. Setup Services
        const llm = createLLMService();
        const fibo = createFiboService();
        // Use two-pass mode for better results as recommended
        const compiler = createSummaryCompiler(llm, { twoPassMode: true });
        const orchestrator = createPosterGenerationOrchestrator(fibo);

        // 3. Compile Summary
        console.log("Compiling summary...");
        const compileResult = await compiler.compile(input.summaryText, {
            arxivId: input.userDetails.arxivId || "unknown",
            knowledgeLevel: input.userDetails.knowledgeLevel,
            tags: input.userDetails.tags,
        });

        if (!compileResult.success) {
            throw new Error(`Compilation failed: ${compileResult.errors?.join(", ")}`);
        }

        // 4. Generate Poster
        console.log("Generating poster...");
        const generationResult = await orchestrator.generate(compileResult.data as GenerationInput);

        if (generationResult.status !== "complete") {
            throw new Error(`Generation failed: ${generationResult.error}`);
        }

        return {
            success: true,
            imageUrl: generationResult.final_image_url,
            outputPath: generationResult.metadata.output_path,
            savedInputPath: saveDir,
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || "Unknown error",
            savedInputPath: saveDir,
        };
    }
}

// Example usage if run directly
if (require.main === module) {
    const exampleInput: PipelineInput = {
        summaryText: "This is a test summary about Artificial Intelligence.",
        userDetails: {
            knowledgeLevel: "beginner",
            tags: ["AI", "Technology"]
        }
    };

    generatePoster(exampleInput).then((res) => {
        console.log("Pipeline Result:", JSON.stringify(res, null, 2));
    });
}
