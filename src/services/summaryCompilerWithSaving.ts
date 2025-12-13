/**
 * Summary Compiler with Full Output Saving
 * Saves all outputs at each execution layer
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
import { OutputSaver } from "../utils/outputSaver";

export interface CompilerConfig {
  maxRetries?: number;
  temperature?: number;
  twoPassMode?: boolean;
  maxTokens?: number;
  saveOutputs?: boolean; // Enable output saving
}

export interface CompilationResult {
  success: boolean;
  data?: GenerationInput;
  errors?: string[];
  rawOutput?: string;
  attempts?: number;
  mode?: "single-pass" | "two-pass";
  semanticData?: any;
  outputSaver?: OutputSaver; // Reference to output saver
}

export class SummaryCompilerWithSaving {
  private llm: LLMService;
  private config: CompilerConfig;
  private outputSaver?: OutputSaver;

  constructor(llm: LLMService, config: CompilerConfig = {}, outputSaver?: OutputSaver) {
    this.llm = llm;
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      temperature: config.temperature ?? 0.1,
      twoPassMode: config.twoPassMode ?? false,
      maxTokens: config.maxTokens ?? 8192,
      saveOutputs: config.saveOutputs ?? true,
    };
    this.outputSaver = outputSaver;
  }

  async compile(
    summaryText: string,
    metadata?: {
      arxivId?: string;
      knowledgeLevel?: string;
      tags?: string[];
    }
  ): Promise<CompilationResult> {
    console.log("\n=== SUMMARY → FIBO COMPILER (WITH SAVING) ===");
    console.log(`Mode: ${this.config.twoPassMode ? "Two-Pass" : "Single-Pass"}`);
    console.log(`Output Saving: ${this.config.saveOutputs ? "Enabled" : "Disabled"}`);

    // Save input
    if (this.outputSaver && this.config.saveOutputs) {
      this.outputSaver.saveInput({
        summaryText,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      });
      console.log(`✓ Saved input to: ${this.outputSaver.getRequestDir()}/1-input/`);
    }

    try {
      if (this.config.twoPassMode) {
        return await this.compileTwoPass(summaryText, metadata);
      } else {
        return await this.compileSinglePass(summaryText, metadata);
      }
    } catch (error) {
      // Save error
      if (this.outputSaver && this.config.saveOutputs) {
        this.outputSaver.saveError("2-compilation", error as Error, {
          summaryText,
          metadata,
        });
      }
      throw error;
    }
  }

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
    const llmResponses: any[] = [];

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

        // Record LLM response
        llmResponses.push({
          attempt: attempts,
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: currentPrompt,
          response: llmResponse.content,
          tokens: llmResponse.usage?.totalTokens || 0,
        });

        // Extract TypeScript code
        const extractedCode = this.extractTypeScriptCode(llmResponse.content);
        console.log("Extracted TypeScript code");

        // Parse and evaluate
        const parsed = this.parseTypeScriptOutput(extractedCode);
        console.log("Parsed TypeScript object");

        // Validate with Zod
        const validation = validateGenerationInput(parsed);

        if (validation.success) {
          console.log("✓ Validation successful!");

          // Save compilation outputs
          if (this.outputSaver && this.config.saveOutputs) {
            this.outputSaver.saveCompilation({
              mode: "single-pass",
              attempts,
              llmResponses,
              rawOutput: llmResponse.content,
              extractedCode,
              parsedObject: parsed,
              validationResult: validation,
              finalConfig: validation.data,
            });
            console.log(`✓ Saved compilation to: ${this.outputSaver.getRequestDir()}/2-compilation/`);
          }

          return {
            success: true,
            data: validation.data,
            rawOutput: llmResponse.content,
            attempts,
            mode: "single-pass",
            outputSaver: this.outputSaver,
          };
        } else {
          console.log("✗ Validation failed:");
          validation.errors.forEach((err) => console.log(`  - ${err}`));
          lastErrors = validation.errors;

          currentPrompt = generateValidationRetryPrompt(userPrompt, validation.errors);
        }
      } catch (error) {
        console.error(`Error in attempt ${attempts}:`, error);
        lastErrors = [(error as Error).message];
      }
    }

    // All retries exhausted - save failure
    if (this.outputSaver && this.config.saveOutputs) {
      this.outputSaver.saveCompilation({
        mode: "single-pass",
        attempts,
        llmResponses,
        rawOutput: llmResponses[llmResponses.length - 1]?.response || "",
        extractedCode: "",
        parsedObject: {},
        validationResult: { success: false, errors: lastErrors },
        errors: lastErrors,
      });
    }

    console.log("\n✗ Compilation failed after all retries");
    return {
      success: false,
      errors: lastErrors,
      attempts,
      mode: "single-pass",
      outputSaver: this.outputSaver,
    };
  }

  private async compileTwoPass(
    summaryText: string,
    metadata?: {
      arxivId?: string;
      knowledgeLevel?: string;
      tags?: string[];
    }
  ): Promise<CompilationResult> {
    console.log("\n--- Pass 1: Semantic Extraction ---");
    const llmResponses: any[] = [];

    try {
      // PASS 1: Extract semantic data
      const extractionResponse = await this.llm.generate({
        systemPrompt: SEMANTIC_EXTRACTION_SYSTEM_PROMPT,
        userPrompt: generateSemanticExtractionPrompt(summaryText),
        temperature: 0.3,
        maxTokens: 2048,
      });

      console.log(`Extraction complete (${extractionResponse.usage?.totalTokens || 0} tokens)`);

      llmResponses.push({
        attempt: 0, // Pass 1
        systemPrompt: SEMANTIC_EXTRACTION_SYSTEM_PROMPT,
        userPrompt: generateSemanticExtractionPrompt(summaryText),
        response: extractionResponse.content,
        tokens: extractionResponse.usage?.totalTokens || 0,
      });

      const semanticData = this.extractJSON(extractionResponse.content);
      console.log("Semantic data extracted");

      const enrichedSemanticData = {
        ...semanticData,
        arxiv_id: metadata?.arxivId || "unknown",
        knowledge_level: metadata?.knowledgeLevel || semanticData.audienceLevel || "beginner",
        tags: metadata?.tags || semanticData.suggestedTags || [],
      };

      console.log("\n--- Pass 2: Deterministic Compilation ---");

      // PASS 2: Compile to TypeScript
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
            temperature: 0.1,
            maxTokens: this.config.maxTokens,
          });

          console.log(`Compilation complete (${compilationResponse.usage?.totalTokens || 0} tokens)`);

          llmResponses.push({
            attempt: attempts,
            systemPrompt: SYSTEM_PROMPT,
            userPrompt: currentPrompt,
            response: compilationResponse.content,
            tokens: compilationResponse.usage?.totalTokens || 0,
          });

          const extractedCode = this.extractTypeScriptCode(compilationResponse.content);
          const parsed = this.parseTypeScriptOutput(extractedCode);
          const validation = validateGenerationInput(parsed);

          if (validation.success) {
            console.log("✓ Validation successful!");

            // Save compilation outputs
            if (this.outputSaver && this.config.saveOutputs) {
              this.outputSaver.saveCompilation({
                mode: "two-pass",
                attempts,
                semanticData: enrichedSemanticData,
                llmResponses,
                rawOutput: compilationResponse.content,
                extractedCode,
                parsedObject: parsed,
                validationResult: validation,
                finalConfig: validation.data,
              });
              console.log(`✓ Saved compilation to: ${this.outputSaver.getRequestDir()}/2-compilation/`);
            }

            return {
              success: true,
              data: validation.data,
              rawOutput: compilationResponse.content,
              attempts,
              mode: "two-pass",
              semanticData: enrichedSemanticData,
              outputSaver: this.outputSaver,
            };
          } else {
            console.log("✗ Validation failed:");
            validation.errors.forEach((err) => console.log(`  - ${err}`));
            lastErrors = validation.errors;

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

      // Compilation failed - save failure
      if (this.outputSaver && this.config.saveOutputs) {
        this.outputSaver.saveCompilation({
          mode: "two-pass",
          attempts,
          semanticData: enrichedSemanticData,
          llmResponses,
          rawOutput: llmResponses[llmResponses.length - 1]?.response || "",
          extractedCode: "",
          parsedObject: {},
          validationResult: { success: false, errors: lastErrors },
          errors: lastErrors,
        });
      }

      return {
        success: false,
        errors: lastErrors,
        attempts,
        mode: "two-pass",
        semanticData: enrichedSemanticData,
        outputSaver: this.outputSaver,
      };
    } catch (error) {
      console.error("Pass 1 (semantic extraction) failed:", error);

      if (this.outputSaver && this.config.saveOutputs) {
        this.outputSaver.saveError("2-compilation", error as Error, {
          mode: "two-pass",
          phase: "semantic-extraction",
        });
      }

      return {
        success: false,
        errors: [(error as Error).message],
        attempts: 0,
        mode: "two-pass",
        outputSaver: this.outputSaver,
      };
    }
  }

  private extractTypeScriptCode(content: string): string {
    const codeBlockMatch = content.match(/```(?:typescript|ts)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return content.trim();
  }

  private extractJSON(content: string): any {
    const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1].trim());
    }
    return JSON.parse(content.trim());
  }

  private parseTypeScriptOutput(code: string): any {
    let cleanCode = code.replace(/export\s+/g, "");
    cleanCode = cleanCode.replace(/:\s*GenerationInput/g, "");

    const objectMatch = cleanCode.match(/const\s+exampleSummary\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!objectMatch) {
      throw new Error("Could not find 'exampleSummary' constant in output");
    }

    const objectLiteral = objectMatch[1];

    try {
      const fn = new Function(`return ${objectLiteral}`);
      return fn();
    } catch (error) {
      throw new Error(`Failed to parse TypeScript output: ${(error as Error).message}`);
    }
  }
}

export function createSummaryCompilerWithSaving(
  llm: LLMService,
  config?: CompilerConfig,
  outputSaver?: OutputSaver
): SummaryCompilerWithSaving {
  return new SummaryCompilerWithSaving(llm, config, outputSaver);
}
