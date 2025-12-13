/**
 * Example: How to use the Poster Generation System
 *
 * This file demonstrates:
 * 1. Basic poster generation
 * 2. Regenerating with different knowledge levels
 * 3. Testing service connections
 */

import { createFiboService } from "../services/fiboService";
import { createPosterGenerationOrchestrator } from "../services/posterGenerationOrchestrator";
import * as fs from 'fs';
import * as path from 'path';
import {
  transformerPaperBeginner,
  transformerPaperIntermediate,
  diffusionPaperBeginner,
} from "../data/exampleSummaries";

/**
 * Example 1: Basic Poster Generation
 */
async function example1_basicGeneration() {
  console.log("\n=== Example 1: Basic Poster Generation ===\n");

  // Initialize services
  const fiboService = createFiboService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService);

  // Generate poster
  const result = await orchestrator.generate(transformerPaperBeginner);

  if (result.status === "complete") {
    console.log("✓ Poster generated successfully!");
    console.log("  Request ID:", result.request_id);
    console.log("  Image URL:", result.final_image_url);
    console.log("  Generation time:", result.metadata.generation_time_ms, "ms");
    console.log("  Generation time:", result.metadata.generation_time_ms, "ms");
    console.log("  FIBO seed:", result.metadata.fibo_seed);

    // Save the image
    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `poster_${result.request_id}.png`;
    const filepath = path.join(outputDir, filename);

    if (result.final_image_url) {
      await downloadImage(result.final_image_url, filepath);
      console.log(`\n✓ Saved poster to: ${filepath}`);
    } else {
      console.warn("No image URL to save.");
    }
  } else {
    console.error("✗ Generation failed:", result.error);
  }

  return result;
}

/**
 * Example 2: Compare Different Knowledge Levels
 */
async function example2_knowledgeLevels() {
  console.log("\n=== Example 2: Different Knowledge Levels ===\n");

  const fiboService = createFiboService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService);

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
 * Example 3: Regenerate with Different Level
 */
async function example3_regenerate() {
  console.log("\n=== Example 3: Regenerate with Different Level ===\n");

  const fiboService = createFiboService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService);

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
 * Example 4: Test Service Connections
 */
async function example4_testConnections() {
  console.log("\n=== Example 4: Test Service Connections ===\n");

  const fiboService = createFiboService();
  const orchestrator = createPosterGenerationOrchestrator(fiboService);

  console.log("Testing service connections...");
  const results = await orchestrator.testServices();

  console.log("\nConnection Status:");
  console.log("  FIBO:", results.fibo ? "✓ Connected" : "✗ Failed");
  console.log("  Overall:", results.overall ? "✓ All Good" : "✗ Issues Detected");

  if (!results.overall) {
    console.log("\n⚠️ Warning: FIBO service is not reachable.");
    console.log("   Check your API key in .env file.");
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
    await example4_testConnections();

    // Uncomment the examples you want to run:

    await example1_basicGeneration();
    // await example2_knowledgeLevels();
    // await example3_regenerate();

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
  example2_knowledgeLevels,
  example3_regenerate,
  example4_testConnections,
};

async function downloadImage(url: string, filepath: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(filepath, buffer);
  } catch (error) {
    console.error(`Failed to save image to ${filepath}:`, error);
  }
}
