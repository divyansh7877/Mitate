/**
 * Example: How to use the Poster Generation System
 *
 * This file demonstrates:
 * 1. Basic poster generation
 * 2. Fast mode generation
 * 3. Regenerating with different knowledge levels
 * 4. Generating style variations
 */

import { createFiboService } from "../services/fiboService";
import { createFalService } from "../services/falService";
import { createPosterGenerationOrchestrator } from "../services/posterGenerationOrchestrator";
import {
  transformerPaperBeginner,
  transformerPaperIntermediate,
  diffusionPaperBeginner,
} from "../data/exampleSummaries";

/**
 * Example 1: Basic Poster Generation (High Quality)
 */
async function example1_basicGeneration() {
  console.log("\n=== Example 1: Basic Poster Generation ===\n");

  // Initialize services
  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  // Generate poster
  const result = await orchestrator.generate(transformerPaperBeginner);

  if (result.status === "complete") {
    console.log("✓ Poster generated successfully!");
    console.log("  Request ID:", result.request_id);
    console.log("  Image URL:", result.final_image_url);
    console.log("  Generation time:", result.metadata.generation_time_ms, "ms");
    console.log("  FIBO seed:", result.metadata.fibo_seed);

    if (result.variations) {
      console.log("  Variations generated:", result.variations.length);
      result.variations.forEach((v, i) => {
        console.log(`    ${i + 1}. ${v.name}: ${v.url}`);
      });
    }
  } else {
    console.error("✗ Generation failed:", result.error);
  }

  return result;
}

/**
 * Example 2: Fast Mode Generation (Using FAL only)
 */
async function example2_fastMode() {
  console.log("\n=== Example 2: Fast Mode Generation ===\n");

  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  const result = await orchestrator.generateFastMode(diffusionPaperBeginner);

  if (result.status === "complete") {
    console.log("✓ Fast poster generated!");
    console.log("  Image URL:", result.final_image_url);
    console.log("  Generation time:", result.metadata.generation_time_ms, "ms");
    console.log("  (Much faster than high-quality mode!)");
  } else {
    console.error("✗ Fast mode failed:", result.error);
  }

  return result;
}

/**
 * Example 3: Compare Different Knowledge Levels
 */
async function example3_knowledgeLevels() {
  console.log("\n=== Example 3: Different Knowledge Levels ===\n");

  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  // Generate beginner level
  console.log("Generating BEGINNER level poster...");
  const beginnerResult = await orchestrator.generate(transformerPaperBeginner);

  // Generate intermediate level
  console.log("Generating INTERMEDIATE level poster...");
  const intermediateResult = await orchestrator.generate(
    transformerPaperIntermediate
  );

  console.log("\n--- Results ---");
  console.log(
    "Beginner:",
    beginnerResult.status,
    "-",
    beginnerResult.metadata.generation_time_ms,
    "ms"
  );
  console.log(
    "Intermediate:",
    intermediateResult.status,
    "-",
    intermediateResult.metadata.generation_time_ms,
    "ms"
  );

  return { beginnerResult, intermediateResult };
}

/**
 * Example 4: Generate Style Variations for Existing Poster
 */
async function example4_styleVariations() {
  console.log("\n=== Example 4: Style Variations ===\n");

  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  // First, generate a base poster
  console.log("Generating base poster...");
  const baseResult = await orchestrator.generate(transformerPaperBeginner);

  if (baseResult.status !== "complete" || !baseResult.final_image_url) {
    console.error("Base poster generation failed");
    return;
  }

  console.log("✓ Base poster generated:", baseResult.final_image_url);

  // Generate variations
  console.log("\nGenerating style variations...");
  const variations = await orchestrator.generateVariationsOnly(
    baseResult.final_image_url
  );

  console.log(`✓ Generated ${variations.length} variations:`);
  variations.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.name}`);
    console.log(`     ${v.description}`);
    console.log(`     ${v.url}`);
  });

  return variations;
}

/**
 * Example 5: Regenerate with Different Level
 */
async function example5_regenerate() {
  console.log("\n=== Example 5: Regenerate with Different Level ===\n");

  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  // Generate beginner level
  console.log("Generating BEGINNER level...");
  const beginnerResult = await orchestrator.generate(transformerPaperBeginner);

  if (beginnerResult.status !== "complete") {
    console.error("Initial generation failed");
    return;
  }

  console.log("✓ Beginner poster generated");

  // Regenerate as intermediate
  console.log("\nRegenerating as INTERMEDIATE level...");
  const intermediateResult = await orchestrator.regenerate(
    transformerPaperBeginner,
    "intermediate"
  );

  console.log("✓ Intermediate poster generated");

  console.log("\n--- Comparison ---");
  console.log("Beginner layout type:", "vertical_flow");
  console.log("Intermediate layout type:", "grid or f_pattern");
  console.log("\nDifferent visual styles applied!");

  return { beginnerResult, intermediateResult };
}

/**
 * Example 6: Error Handling and Fallback
 */
async function example6_errorHandling() {
  console.log("\n=== Example 6: Error Handling ===\n");

  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  try {
    // Try high-quality generation
    console.log("Attempting high-quality generation...");
    const result = await orchestrator.generate(transformerPaperBeginner);

    if (result.status === "failed") {
      console.log("High-quality generation failed, trying fast mode...");

      // Fallback to fast mode
      const fallbackResult =
        await orchestrator.generateFastMode(transformerPaperBeginner);

      if (fallbackResult.status === "complete") {
        console.log("✓ Fallback successful!");
        return fallbackResult;
      } else {
        throw new Error("Both methods failed");
      }
    }

    console.log("✓ High-quality generation succeeded!");
    return result;
  } catch (error) {
    console.error("✗ All generation methods failed:", error);
    throw error;
  }
}

/**
 * Example 7: Test Service Connections
 */
async function example7_testConnections() {
  console.log("\n=== Example 7: Test Service Connections ===\n");

  const fiboService = createFiboService();
  const falService = createFalService();
  const orchestrator = createPosterGenerationOrchestrator(
    fiboService,
    falService
  );

  console.log("Testing service connections...");
  const results = await orchestrator.testServices();

  console.log("\nConnection Status:");
  console.log("  FIBO:", results.fibo ? "✓ Connected" : "✗ Failed");
  console.log("  FAL:", results.fal ? "✓ Connected" : "✗ Failed");
  console.log("  Overall:", results.overall ? "✓ All Good" : "✗ Issues Detected");

  if (!results.overall) {
    console.log("\n⚠️ Warning: Some services are not reachable.");
    console.log("   Check your API keys in .env file.");
  }

  return results;
}

/**
 * Main function - Run all examples
 */
async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   Poster Generation System - Usage Examples              ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  try {
    // Test connections first
    await example7_testConnections();

    // Uncomment the examples you want to run:

    // await example1_basicGeneration();
    // await example2_fastMode();
    // await example3_knowledgeLevels();
    // await example4_styleVariations();
    // await example5_regenerate();
    // await example6_errorHandling();

    console.log("\n✓ All examples completed successfully!");
  } catch (error) {
    console.error("\n✗ Error running examples:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other files
export {
  example1_basicGeneration,
  example2_fastMode,
  example3_knowledgeLevels,
  example4_styleVariations,
  example5_regenerate,
  example6_errorHandling,
  example7_testConnections,
};
