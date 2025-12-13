/**
 * Output Saver: Save all outputs at each execution layer
 * Creates organized directory structure with timestamped outputs
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export interface LayerOutput {
  layer: string;
  timestamp: string;
  data: any;
  metadata?: any;
}

export class OutputSaver {
  private requestId: string;
  private baseDir: string;
  private layerOutputs: Map<string, any[]>;

  constructor(requestId: string, baseDir: string = "./output") {
    this.requestId = requestId;
    this.baseDir = baseDir;
    this.layerOutputs = new Map();

    // Create directory structure
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories() {
    const dirs = [
      this.baseDir,
      join(this.baseDir, "requests"),
      join(this.baseDir, "requests", this.requestId),
      join(this.baseDir, "requests", this.requestId, "1-input"),
      join(this.baseDir, "requests", this.requestId, "2-compilation"),
      join(this.baseDir, "requests", this.requestId, "3-layout"),
      join(this.baseDir, "requests", this.requestId, "4-prompt"),
      join(this.baseDir, "requests", this.requestId, "5-generation"),
      join(this.baseDir, "requests", this.requestId, "6-final"),
    ];

    dirs.forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get directory for a specific layer
   */
  private getLayerDir(layer: string): string {
    return join(this.baseDir, "requests", this.requestId, layer);
  }

  /**
   * Save input summary
   */
  saveInput(data: {
    summaryText: string;
    metadata: any;
    timestamp: string;
  }) {
    const dir = this.getLayerDir("1-input");

    // Save raw summary text
    writeFileSync(
      join(dir, "summary.txt"),
      data.summaryText,
      "utf-8"
    );

    // Save metadata
    writeFileSync(
      join(dir, "metadata.json"),
      JSON.stringify(data.metadata, null, 2),
      "utf-8"
    );

    // Save combined input
    writeFileSync(
      join(dir, "input.json"),
      JSON.stringify(data, null, 2),
      "utf-8"
    );

    this.logLayer("1-input", data);
  }

  /**
   * Save compilation outputs
   */
  saveCompilation(data: {
    mode: "single-pass" | "two-pass";
    attempts: number;
    semanticData?: any;
    llmResponses: Array<{
      attempt: number;
      systemPrompt: string;
      userPrompt: string;
      response: string;
      tokens: number;
    }>;
    rawOutput: string;
    extractedCode: string;
    parsedObject: any;
    validationResult: any;
    finalConfig?: any;
    errors?: string[];
  }) {
    const dir = this.getLayerDir("2-compilation");

    // Save mode info
    writeFileSync(
      join(dir, "mode.txt"),
      `Compilation Mode: ${data.mode}\nAttempts: ${data.attempts}`,
      "utf-8"
    );

    // Save semantic data (two-pass mode)
    if (data.semanticData) {
      writeFileSync(
        join(dir, "semantic-data.json"),
        JSON.stringify(data.semanticData, null, 2),
        "utf-8"
      );
    }

    // Save each LLM attempt
    data.llmResponses.forEach((attempt, idx) => {
      const attemptDir = join(dir, `attempt-${idx + 1}`);
      mkdirSync(attemptDir, { recursive: true });

      writeFileSync(
        join(attemptDir, "system-prompt.txt"),
        attempt.systemPrompt,
        "utf-8"
      );

      writeFileSync(
        join(attemptDir, "user-prompt.txt"),
        attempt.userPrompt,
        "utf-8"
      );

      writeFileSync(
        join(attemptDir, "llm-response.txt"),
        attempt.response,
        "utf-8"
      );

      writeFileSync(
        join(attemptDir, "metadata.json"),
        JSON.stringify({
          attempt: attempt.attempt,
          tokens: attempt.tokens,
          timestamp: new Date().toISOString(),
        }, null, 2),
        "utf-8"
      );
    });

    // Save extracted code
    writeFileSync(
      join(dir, "extracted-code.ts"),
      data.extractedCode,
      "utf-8"
    );

    // Save parsed object
    writeFileSync(
      join(dir, "parsed-object.json"),
      JSON.stringify(data.parsedObject, null, 2),
      "utf-8"
    );

    // Save validation result
    writeFileSync(
      join(dir, "validation-result.json"),
      JSON.stringify(data.validationResult, null, 2),
      "utf-8"
    );

    // Save final config or errors
    if (data.finalConfig) {
      writeFileSync(
        join(dir, "final-config.json"),
        JSON.stringify(data.finalConfig, null, 2),
        "utf-8"
      );
    } else if (data.errors) {
      writeFileSync(
        join(dir, "errors.json"),
        JSON.stringify(data.errors, null, 2),
        "utf-8"
      );
    }

    // Save summary
    writeFileSync(
      join(dir, "summary.json"),
      JSON.stringify({
        mode: data.mode,
        attempts: data.attempts,
        success: !!data.finalConfig,
        errors: data.errors || [],
      }, null, 2),
      "utf-8"
    );

    this.logLayer("2-compilation", data);
  }

  /**
   * Save layout calculation
   */
  saveLayout(data: {
    input: {
      numConcepts: number;
      knowledgeLevel: string;
      tags: string[];
    };
    selectedLayout: any;
    alternativeLayouts?: any[];
    calculations: any;
  }) {
    const dir = this.getLayerDir("3-layout");

    // Save input parameters
    writeFileSync(
      join(dir, "input.json"),
      JSON.stringify(data.input, null, 2),
      "utf-8"
    );

    // Save selected layout
    writeFileSync(
      join(dir, "selected-layout.json"),
      JSON.stringify(data.selectedLayout, null, 2),
      "utf-8"
    );

    // Save alternatives
    if (data.alternativeLayouts) {
      writeFileSync(
        join(dir, "alternative-layouts.json"),
        JSON.stringify(data.alternativeLayouts, null, 2),
        "utf-8"
      );
    }

    // Save calculations
    writeFileSync(
      join(dir, "calculations.json"),
      JSON.stringify(data.calculations, null, 2),
      "utf-8"
    );

    this.logLayer("3-layout", data);
  }

  /**
   * Save FIBO prompt building
   */
  savePromptBuilding(data: {
    generationInput: any;
    layoutStrategy: any;
    fiboPrompt: any;
    components: {
      shortDescription: string;
      objects: any[];
      textElements: any[];
      background: any;
      lighting: any;
      aesthetics: any;
      typography: any;
      colorScheme: any;
    };
    validation: {
      valid: boolean;
      errors: string[];
    };
  }) {
    const dir = this.getLayerDir("4-prompt");

    // Save inputs
    writeFileSync(
      join(dir, "generation-input.json"),
      JSON.stringify(data.generationInput, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(dir, "layout-strategy.json"),
      JSON.stringify(data.layoutStrategy, null, 2),
      "utf-8"
    );

    // Save final FIBO prompt
    writeFileSync(
      join(dir, "fibo-prompt.json"),
      JSON.stringify(data.fiboPrompt, null, 2),
      "utf-8"
    );

    // Save components separately
    const componentsDir = join(dir, "components");
    mkdirSync(componentsDir, { recursive: true });

    writeFileSync(
      join(componentsDir, "short-description.txt"),
      data.components.shortDescription,
      "utf-8"
    );

    writeFileSync(
      join(componentsDir, "objects.json"),
      JSON.stringify(data.components.objects, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(componentsDir, "text-elements.json"),
      JSON.stringify(data.components.textElements, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(componentsDir, "background.json"),
      JSON.stringify(data.components.background, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(componentsDir, "lighting.json"),
      JSON.stringify(data.components.lighting, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(componentsDir, "aesthetics.json"),
      JSON.stringify(data.components.aesthetics, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(componentsDir, "typography.json"),
      JSON.stringify(data.components.typography, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(componentsDir, "color-scheme.json"),
      JSON.stringify(data.components.colorScheme, null, 2),
      "utf-8"
    );

    // Save validation
    writeFileSync(
      join(dir, "validation.json"),
      JSON.stringify(data.validation, null, 2),
      "utf-8"
    );

    this.logLayer("4-prompt", data);
  }

  /**
   * Save FIBO generation process
   */
  saveGeneration(data: {
    request: any;
    response: any;
    pollingAttempts?: number;
    pollingLog?: Array<{
      attempt: number;
      status: string;
      timestamp: string;
    }>;
    imageUrl?: string;
    generationTimeMs: number;
  }) {
    const dir = this.getLayerDir("5-generation");

    // Save request
    writeFileSync(
      join(dir, "fibo-request.json"),
      JSON.stringify(data.request, null, 2),
      "utf-8"
    );

    // Save response
    writeFileSync(
      join(dir, "fibo-response.json"),
      JSON.stringify(data.response, null, 2),
      "utf-8"
    );

    // Save polling log
    if (data.pollingLog) {
      writeFileSync(
        join(dir, "polling-log.json"),
        JSON.stringify(data.pollingLog, null, 2),
        "utf-8"
      );
    }

    // Save metadata
    writeFileSync(
      join(dir, "metadata.json"),
      JSON.stringify({
        pollingAttempts: data.pollingAttempts,
        imageUrl: data.imageUrl,
        generationTimeMs: data.generationTimeMs,
        timestamp: new Date().toISOString(),
      }, null, 2),
      "utf-8"
    );

    this.logLayer("5-generation", data);
  }

  /**
   * Save final outputs
   */
  saveFinal(data: {
    imageUrl: string;
    localPath?: string;
    metadata: any;
    totalTimeMs: number;
    allLayers: any;
  }) {
    const dir = this.getLayerDir("6-final");

    // Save final metadata
    writeFileSync(
      join(dir, "final-metadata.json"),
      JSON.stringify(data.metadata, null, 2),
      "utf-8"
    );

    // Save image info
    writeFileSync(
      join(dir, "image-info.json"),
      JSON.stringify({
        imageUrl: data.imageUrl,
        localPath: data.localPath,
        totalTimeMs: data.totalTimeMs,
      }, null, 2),
      "utf-8"
    );

    // Save complete pipeline summary
    writeFileSync(
      join(dir, "pipeline-summary.json"),
      JSON.stringify(data.allLayers, null, 2),
      "utf-8"
    );

    this.logLayer("6-final", data);
  }

  /**
   * Save error at any layer
   */
  saveError(layer: string, error: Error, context?: any) {
    const dir = this.getLayerDir(layer);

    writeFileSync(
      join(dir, "error.json"),
      JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      }, null, 2),
      "utf-8"
    );

    writeFileSync(
      join(dir, "error.txt"),
      `Error: ${error.message}\n\nStack:\n${error.stack}\n\nContext:\n${JSON.stringify(context, null, 2)}`,
      "utf-8"
    );
  }

  /**
   * Internal logging
   */
  private logLayer(layer: string, data: any) {
    if (!this.layerOutputs.has(layer)) {
      this.layerOutputs.set(layer, []);
    }

    this.layerOutputs.get(layer)!.push({
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Get base directory for this request
   */
  getRequestDir(): string {
    return join(this.baseDir, "requests", this.requestId);
  }

  /**
   * Generate execution report
   */
  generateReport(): string {
    const reportPath = join(this.getRequestDir(), "EXECUTION_REPORT.md");

    const report = `# Execution Report: ${this.requestId}

Generated: ${new Date().toISOString()}

## Directory Structure

\`\`\`
${this.requestId}/
├── 1-input/              Input summary and metadata
├── 2-compilation/        LLM compilation (all attempts)
├── 3-layout/             Layout calculation
├── 4-prompt/             FIBO prompt building
├── 5-generation/         FIBO API generation
└── 6-final/              Final outputs and summary
\`\`\`

## Layer Details

### 1. Input Layer
- **Location:** \`1-input/\`
- **Files:**
  - \`summary.txt\` - Raw input summary
  - \`metadata.json\` - Input metadata (arxiv_id, knowledge_level, tags)
  - \`input.json\` - Combined input data

### 2. Compilation Layer
- **Location:** \`2-compilation/\`
- **Files:**
  - \`mode.txt\` - Compilation mode (single-pass or two-pass)
  - \`semantic-data.json\` - Semantic extraction (two-pass only)
  - \`attempt-N/\` - Each LLM attempt
    - \`system-prompt.txt\` - System prompt sent to LLM
    - \`user-prompt.txt\` - User prompt sent to LLM
    - \`llm-response.txt\` - Raw LLM response
    - \`metadata.json\` - Attempt metadata (tokens, timestamp)
  - \`extracted-code.ts\` - Extracted TypeScript code
  - \`parsed-object.json\` - Parsed JavaScript object
  - \`validation-result.json\` - Zod validation result
  - \`final-config.json\` - Successfully compiled config
  - \`summary.json\` - Compilation summary

### 3. Layout Layer
- **Location:** \`3-layout/\`
- **Files:**
  - \`input.json\` - Layout calculation inputs
  - \`selected-layout.json\` - Chosen layout strategy
  - \`alternative-layouts.json\` - Other layout options
  - \`calculations.json\` - Layout calculations

### 4. Prompt Building Layer
- **Location:** \`4-prompt/\`
- **Files:**
  - \`generation-input.json\` - Input configuration
  - \`layout-strategy.json\` - Selected layout
  - \`fibo-prompt.json\` - Complete FIBO structured prompt
  - \`components/\` - Individual prompt components
    - \`short-description.txt\`
    - \`objects.json\`
    - \`text-elements.json\`
    - \`background.json\`
    - \`lighting.json\`
    - \`aesthetics.json\`
    - \`typography.json\`
    - \`color-scheme.json\`
  - \`validation.json\` - Prompt validation result

### 5. Generation Layer
- **Location:** \`5-generation/\`
- **Files:**
  - \`fibo-request.json\` - Request sent to FIBO API
  - \`fibo-response.json\` - Response from FIBO API
  - \`polling-log.json\` - Polling attempts log
  - \`metadata.json\` - Generation metadata

### 6. Final Layer
- **Location:** \`6-final/\`
- **Files:**
  - \`final-metadata.json\` - Complete metadata
  - \`image-info.json\` - Image URL and local path
  - \`pipeline-summary.json\` - Complete pipeline data

## How to Use This Output

### Debugging
- Check each layer's files to understand what happened at each step
- Look for \`error.json\` files in any layer for failures
- Review LLM prompts and responses in \`2-compilation/attempt-N/\`

### Analysis
- Compare different compilation attempts
- Analyze layout choices and alternatives
- Review FIBO prompt components
- Check generation polling logs

### Reproduction
- Use the saved prompts to reproduce LLM calls
- Use the saved config to regenerate posters
- Compare outputs across different runs

### Optimization
- Analyze token usage in compilation attempts
- Review generation time in metadata
- Compare alternative layouts
- Optimize prompt components

## Next Steps

1. Review the final poster in \`6-final/image-info.json\`
2. Check compilation attempts in \`2-compilation/\`
3. Analyze prompt components in \`4-prompt/components/\`
4. Review generation logs in \`5-generation/\`

---

For questions or issues, check the documentation.
`;

    writeFileSync(reportPath, report, "utf-8");

    return reportPath;
  }
}

/**
 * Create output saver with auto-generated request ID
 */
export function createOutputSaver(baseDir?: string): OutputSaver {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const requestId = `req_${timestamp}`;
  return new OutputSaver(requestId, baseDir);
}
