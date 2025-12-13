/**
 * Summary → FIBO Pipeline Compiler
 * Converts unstructured summaries into strictly-typed TypeScript configurations
 * Acts as a deterministic compiler, not a creative writer
 */

import type { GenerationInput } from "../types/poster";
import { validateGenerationInput } from "../schemas/generationInput.schema";
import { LLMService } from "./llmService";
import {
  SYSTEM_PROMPT,
  SEMANTIC_EXTRACTION_SYSTEM_PROMPT,
  generateUserPrompt,
  generateSemanticExtractionPrompt,
  generateCompilationPromptFromSemanticData,
  generateValidationRetryPrompt,
} from "./promptTemplates";

export interface CompilerConfig {
  maxRetries?: number;
  temperature?: number;
  twoPassMode?: boolean;
  maxTokens?: number;
}

export interface CompilationResult {
  success: boolean;
  data?: GenerationInput;
  errors?: string[];
  rawOutput?: string;
  attempts?: number;
  mode?: "single-pass" | "two-pass";
  semanticData?: any;
}

/**
 * Main Compiler Service
 * Orchestrates LLM calls, validation, and retry logic
 */
export class SummaryCompiler {
  private llm: LLMService;
  private config: CompilerConfig;

  constructor(llm: LLMService, config: CompilerConfig = {}) {
    this.llm = llm;
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      temperature: config.temperature ?? 0.1,
      twoPassMode: config.twoPassMode ?? false,
      maxTokens: config.maxTokens ?? 8192,
    };
  }

  /**
   * Compile a natural language summary into GenerationInput
   */
  async compile(
    summaryText: string,
    metadata?: {
      arxivId?: string;
      knowledgeLevel?: string;
      tags?: string[];
    }
  ): Promise<CompilationResult> {
    console.log("\n=== SUMMARY → FIBO COMPILER ===");
    console.log(`Mode: ${this.config.twoPassMode ? "Two-Pass" : "Single-Pass"}`);
    console.log(`Max Retries: ${this.config.maxRetries}`);

    if (this.config.twoPassMode) {
      return this.compileTwoPass(summaryText, metadata);
    } else {
      return this.compileSinglePass(summaryText, metadata);
    }
  }

  /**
   * Single-pass compilation (direct LLM → TypeScript)
   */
  private async compileSinglePass(
    summaryText: string,
    metadata?: {
      arxivId?: string;
      knowledgeLevel?: string;
      tags?: string[];
    }
  ): Promise<CompilationResult> {
    const userPrompt = generateUserPrompt(summaryText, metadata);
    let attempts = 0;
    let lastErrors: string[] = [];
    let currentPrompt = userPrompt;

    while (attempts < this.config.maxRetries!) {
      attempts++;
      console.log(`\nAttempt ${attempts}/${this.config.maxRetries}`);

      try {
        // Call LLM
        const llmResponse = await this.llm.generate({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: currentPrompt,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });

        console.log(`LLM Response (${llmResponse.usage?.totalTokens || 0} tokens)`);

        // Extract TypeScript code from response
        const extractedCode = this.extractTypeScriptCode(llmResponse.content);
        console.log("Extracted TypeScript code");

        // Parse and evaluate
        const parsed = this.parseTypeScriptOutput(extractedCode);
        console.log("Parsed TypeScript object");

        // Validate with Zod
        const validation = validateGenerationInput(parsed);

        if (validation.success) {
          console.log("✓ Validation successful!");
          return {
            success: true,
            data: validation.data,
            rawOutput: llmResponse.content,
            attempts,
            mode: "single-pass",
          };
        } else {
          console.log("✗ Validation failed:");
          validation.errors.forEach((err) => console.log(`  - ${err}`));
          lastErrors = validation.errors;

          // Generate retry prompt with validation errors
          currentPrompt = generateValidationRetryPrompt(userPrompt, validation.errors);
        }
      } catch (error) {
        console.error(`Error in attempt ${attempts}:`, error);
        lastErrors = [(error as Error).message];
      }
    }

    // All retries exhausted
    console.log("\n✗ Compilation failed after all retries");
    return {
      success: false,
      errors: lastErrors,
      attempts,
      mode: "single-pass",
    };
  }

  /**
   * Two-pass compilation (semantic extraction → deterministic compilation)
   * Dramatically reduces hallucination
   */
  private async compileTwoPass(
    summaryText: string,
    metadata?: {
      arxivId?: string;
      knowledgeLevel?: string;
      tags?: string[];
    }
  ): Promise<CompilationResult> {
    console.log("\n--- Pass 1: Semantic Extraction ---");

    try {
      // PASS 1: Extract semantic data
      const extractionResponse = await this.llm.generate({
        systemPrompt: SEMANTIC_EXTRACTION_SYSTEM_PROMPT,
        userPrompt: generateSemanticExtractionPrompt(summaryText),
        temperature: 0.3, // Slightly higher for extraction
        maxTokens: 2048,
      });

      console.log(`Extraction complete (${extractionResponse.usage?.totalTokens || 0} tokens)`);

      // Parse JSON
      const semanticData = this.extractJSON(extractionResponse.content);
      console.log("Semantic data extracted:");
      console.log(JSON.stringify(semanticData, null, 2));

      // Merge with metadata
      const enrichedSemanticData = {
        ...semanticData,
        arxiv_id: metadata?.arxivId || "unknown",
        knowledge_level: metadata?.knowledgeLevel || semanticData.audienceLevel || "beginner",
        tags: metadata?.tags || semanticData.suggestedTags || [],
      };

      console.log("\n--- Pass 2: Deterministic Compilation ---");

      // PASS 2: Compile to TypeScript using semantic data
      let attempts = 0;
      let lastErrors: string[] = [];
      let currentPrompt = generateCompilationPromptFromSemanticData(enrichedSemanticData);

      while (attempts < this.config.maxRetries!) {
        attempts++;
        console.log(`\nAttempt ${attempts}/${this.config.maxRetries}`);

        try {
          const compilationResponse = await this.llm.generate({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt: currentPrompt,
            temperature: 0.1, // Very low for deterministic output
            maxTokens: this.config.maxTokens,
          });

          console.log(`Compilation complete (${compilationResponse.usage?.totalTokens || 0} tokens)`);

          // Extract and parse
          const extractedCode = this.extractTypeScriptCode(compilationResponse.content);
          const parsed = this.parseTypeScriptOutput(extractedCode);

          // Validate
          const validation = validateGenerationInput(parsed);

          if (validation.success) {
            console.log("✓ Validation successful!");
            return {
              success: true,
              data: validation.data,
              rawOutput: compilationResponse.content,
              attempts,
              mode: "two-pass",
              semanticData: enrichedSemanticData,
            };
          } else {
            console.log("✗ Validation failed:");
            validation.errors.forEach((err) => console.log(`  - ${err}`));
            lastErrors = validation.errors;

            // Retry with errors
            currentPrompt = generateValidationRetryPrompt(
              generateCompilationPromptFromSemanticData(enrichedSemanticData),
              validation.errors
            );
          }
        } catch (error) {
          console.error(`Error in attempt ${attempts}:`, error);
          lastErrors = [(error as Error).message];
        }
      }

      // Compilation failed
      return {
        success: false,
        errors: lastErrors,
        attempts,
        mode: "two-pass",
        semanticData: enrichedSemanticData,
      };
    } catch (error) {
      console.error("Pass 1 (semantic extraction) failed:", error);
      return {
        success: false,
        errors: [(error as Error).message],
        attempts: 0,
        mode: "two-pass",
      };
    }
  }

  /**
   * Extract TypeScript code from LLM response
   * Handles markdown code blocks and raw code
   */
  private extractTypeScriptCode(content: string): string {
    // Try to extract from code block
    const codeBlockMatch = content.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block, assume entire content is code
    return content.trim();
  }

  /**
   * Extract JSON from LLM response
   */
  private extractJSON(content: string): any {
    // Try to extract from code block
    const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1].trim());
    }

    // Try to parse directly
    return JSON.parse(content.trim());
  }

  /**
   * Parse TypeScript output into JavaScript object
   * SECURITY: Controlled evaluation environment
   */
  private parseTypeScriptOutput(code: string): any {
    // Remove 'export' keywords
    let cleanCode = code.replace(/export\s+/g, "");

    // Remove type annotations (basic removal)
    cleanCode = cleanCode.replace(/:\s*GenerationInput/g, "");

    // Extract the object literal
    const objectMatch = cleanCode.match(/const\s+exampleSummary\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!objectMatch) {
      throw new Error("Could not find 'exampleSummary' constant in output");
    }

    const objectLiteral = objectMatch[1];

    // SAFE EVALUATION: Use Function constructor (safer than eval)
    // This is still a controlled environment since we're parsing known structures
    try {
      const fn = new Function(`return ${objectLiteral}`);
      return fn();
    } catch (error) {
      throw new Error(`Failed to parse TypeScript output: ${(error as Error).message}`);
    }
  }

  /**
   * Test compiler with a simple input
   */
  async test(): Promise<boolean> {
    console.log("\n=== COMPILER TEST ===");

    const testSummary = `
    The Transformer paper introduces a new architecture based entirely on attention mechanisms.
    It uses self-attention to process sequences in parallel, unlike RNNs which process sequentially.
    Key innovations include multi-head attention and positional encodings.
    The model achieves state-of-the-art results on translation tasks with faster training.
    `;

    const result = await this.compile(testSummary, {
      arxivId: "1706.03762",
      knowledgeLevel: "beginner",
      tags: ["nlp", "architecture"],
    });

    console.log("\nTest Result:", result.success ? "✓ PASS" : "✗ FAIL");
    return result.success;
  }
}

/**
 * Factory function to create compiler from environment
 */
export function createSummaryCompiler(
  llm: LLMService,
  config?: CompilerConfig
): SummaryCompiler {
  return new SummaryCompiler(llm, config);
}
