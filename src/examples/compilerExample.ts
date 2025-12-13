/**
 * Example Usage: Summary → FIBO Pipeline Compiler
 *
 * This example demonstrates how to use the compiler system to convert
 * unstructured research paper summaries into strictly-typed GenerationInput objects
 */

import { createLLMService } from "../services/llmService";
import { createSummaryCompiler } from "../services/summaryCompiler";
import { createPosterGenerationOrchestrator } from "../services/posterGenerationOrchestrator";
import { createFiboService } from "../services/fiboService";

/**
 * Example 1: Basic Single-Pass Compilation
 */
async function example1_BasicCompilation() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 1: Basic Single-Pass Compilation");
  console.log("=".repeat(60));

  // Create LLM service
  const llm = createLLMService();

  // Create compiler (single-pass mode)
  const compiler = createSummaryCompiler(llm, {
    maxRetries: 3,
    twoPassMode: false,
  });

  // Unstructured summary text
  const summaryText = `
  CLIP (Contrastive Language-Image Pre-training) is a neural network trained on
  400 million image-text pairs from the internet. It learns to connect images and
  text by predicting which captions go with which images. This simple approach
  enables zero-shot transfer to many vision tasks without task-specific training.

  Key concepts include:
  - Contrastive learning between image and text encoders
  - Large-scale pre-training on diverse web data
  - Zero-shot transfer without fine-tuning

  CLIP achieves competitive results on many benchmarks without seeing task-specific
  examples, demonstrating that language supervision is a powerful way to learn
  visual concepts. It powers applications like text-to-image search, image generation
  guidance, and content moderation.
  `;

  // Compile to GenerationInput
  const result = await compiler.compile(summaryText, {
    arxivId: "2103.00020",
    knowledgeLevel: "intermediate",
    tags: ["vision", "nlp", "multimodal", "transfer-learning"],
  });

  if (result.success) {
    console.log("\n✓ Compilation successful!");
    console.log("Generated config:", JSON.stringify(result.data, null, 2));
  } else {
    console.error("\n✗ Compilation failed:", result.errors);
  }

  return result;
}

/**
 * Example 2: Two-Pass Compilation (Semantic Extraction + Compilation)
 */
async function example2_TwoPassCompilation() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 2: Two-Pass Compilation");
  console.log("=".repeat(60));

  const llm = createLLMService();

  // Enable two-pass mode
  const compiler = createSummaryCompiler(llm, {
    maxRetries: 3,
    twoPassMode: true, // KEY DIFFERENCE
  });

  const summaryText = `
  Diffusion Models (DDPM) generate high-quality images by learning to reverse
  a gradual noising process. Starting from pure noise, the model learns to
  iteratively denoise and create detailed images. This approach is more stable
  than GANs and produces diverse, high-fidelity results.

  The key insight is modeling the reverse diffusion process as a Markov chain,
  where each step predicts slightly less noise. Training uses a simple mean
  squared error loss between predicted and actual noise.

  DDPMs enable controllable generation, image editing, and super-resolution,
  forming the basis for modern text-to-image models like DALL-E 2 and Stable Diffusion.
  `;

  const result = await compiler.compile(summaryText, {
    arxivId: "2006.11239",
    knowledgeLevel: "advanced",
    tags: ["generative", "probabilistic", "image-synthesis"],
  });

  if (result.success) {
    console.log("\n✓ Two-pass compilation successful!");
    console.log("Semantic data:", JSON.stringify(result.semanticData, null, 2));
    console.log("\nGenerated config:", JSON.stringify(result.data, null, 2));
  } else {
    console.error("\n✗ Compilation failed:", result.errors);
  }

  return result;
}

/**
 * Example 3: End-to-End Pipeline (Compile + Generate Poster)
 */
async function example3_EndToEndPipeline() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 3: End-to-End Pipeline (Compile → Generate)");
  console.log("=".repeat(60));

  // Step 1: Compile summary
  const llm = createLLMService();
  const compiler = createSummaryCompiler(llm, {
    twoPassMode: true,
  });

  const summaryText = `
  Graph Neural Networks (GNNs) extend deep learning to graph-structured data
  by learning representations that incorporate graph topology. Each node aggregates
  information from its neighbors, allowing the network to capture relational patterns.

  Key techniques include message passing, graph convolutions, and attention mechanisms
  adapted for graphs. GNNs excel at tasks like node classification, link prediction,
  and graph generation.

  Applications span social networks, molecular property prediction, recommendation
  systems, and knowledge graphs, making them essential for relational AI.
  `;

  console.log("\n--- Step 1: Compiling Summary ---");
  const compileResult = await compiler.compile(summaryText, {
    arxivId: "1609.02907",
    knowledgeLevel: "intermediate",
    tags: ["graph-learning", "relational", "structured-data"],
  });

  if (!compileResult.success) {
    console.error("✗ Compilation failed:", compileResult.errors);
    return;
  }

  console.log("✓ Compilation successful!");

  // Step 2: Generate poster using FIBO
  console.log("\n--- Step 2: Generating Poster ---");
  const fiboService = createFiboService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService);

  const generationResult = await orchestrator.generate(compileResult.data!);

  if (generationResult.status === "complete") {
    console.log("\n✓ Poster generation complete!");
    console.log("Image URL:", generationResult.final_image_url);
    console.log("Generation time:", generationResult.metadata.generation_time_ms, "ms");
  } else {
    console.error("✗ Poster generation failed:", generationResult.error);
  }

  return { compileResult, generationResult };
}

/**
 * Example 4: Batch Compilation (Multiple Papers)
 */
async function example4_BatchCompilation() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 4: Batch Compilation");
  console.log("=".repeat(60));

  const llm = createLLMService();
  const compiler = createSummaryCompiler(llm, { twoPassMode: true });

  const papers = [
    {
      summary: "ResNet introduces skip connections that allow training very deep networks...",
      arxivId: "1512.03385",
      level: "beginner" as const,
      tags: ["architecture", "vision"],
    },
    {
      summary: "BERT uses bidirectional transformers for language understanding...",
      arxivId: "1810.04805",
      level: "intermediate" as const,
      tags: ["nlp", "transfer-learning"],
    },
    {
      summary: "AlphaFold predicts protein structures with atomic accuracy...",
      arxivId: "2021.10.04",
      level: "advanced" as const,
      tags: ["biology", "structure-prediction"],
    },
  ];

  console.log(`\nCompiling ${papers.length} papers...`);

  const results = await Promise.all(
    papers.map(async (paper, idx) => {
      console.log(`\n[${idx + 1}/${papers.length}] Compiling: ${paper.arxivId}`);
      return compiler.compile(paper.summary, {
        arxivId: paper.arxivId,
        knowledgeLevel: paper.level,
        tags: paper.tags,
      });
    })
  );

  const successful = results.filter((r) => r.success).length;
  console.log(`\n✓ Batch complete: ${successful}/${papers.length} successful`);

  return results;
}

/**
 * Example 5: Compiler Test
 */
async function example5_CompilerTest() {
  console.log("\n" + "=".repeat(60));
  console.log("EXAMPLE 5: Compiler Self-Test");
  console.log("=".repeat(60));

  const llm = createLLMService();
  const compiler = createSummaryCompiler(llm);

  const success = await compiler.test();

  return success;
}

/**
 * Main execution
 */
async function main() {
  console.log("\n");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  SUMMARY → FIBO PIPELINE COMPILER - EXAMPLES             ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  try {
    // Run example based on command-line argument
    const exampleNum = process.argv[2] || "1";

    switch (exampleNum) {
      case "1":
        await example1_BasicCompilation();
        break;
      case "2":
        await example2_TwoPassCompilation();
        break;
      case "3":
        await example3_EndToEndPipeline();
        break;
      case "4":
        await example4_BatchCompilation();
        break;
      case "5":
        await example5_CompilerTest();
        break;
      case "all":
        await example1_BasicCompilation();
        await example2_TwoPassCompilation();
        await example3_EndToEndPipeline();
        await example4_BatchCompilation();
        await example5_CompilerTest();
        break;
      default:
        console.log("Usage: tsx compilerExample.ts [1|2|3|4|5|all]");
        console.log("  1: Basic single-pass compilation");
        console.log("  2: Two-pass compilation");
        console.log("  3: End-to-end pipeline (compile + generate)");
        console.log("  4: Batch compilation");
        console.log("  5: Compiler self-test");
        console.log("  all: Run all examples");
    }
  } catch (error) {
    console.error("\n✗ Example failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other modules
export {
  example1_BasicCompilation,
  example2_TwoPassCompilation,
  example3_EndToEndPipeline,
  example4_BatchCompilation,
  example5_CompilerTest,
};
