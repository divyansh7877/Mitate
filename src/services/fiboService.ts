/**
 * FIBO (Bria AI) API Service
 * Handles structured prompt-based image generation
 */

import type {
  FiboStructuredPrompt,
  FiboGenerationRequest,
  FiboGenerationResponse,
} from "../types/poster";

export class FiboService {
  private apiKey: string;
  private baseUrl: string;
  private maxPollAttempts: number = 60; // 60 attempts * 2s = 2 minutes max
  private pollIntervalMs: number = 2000;

  constructor(apiKey: string, baseUrl: string = "https://api.fibo.com/v2") {
    if (!apiKey) {
      throw new Error("FIBO API key is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a poster using FIBO's structured prompt API
   */
  async generatePoster(
    request: FiboGenerationRequest
  ): Promise<FiboGenerationResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/image/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structured_prompt: request.structured_prompt,
          seed: request.seed || this.generateSeed(),
          image_size: request.image_size || { width: 1024, height: 1024 },
          output_format: "png",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `FIBO API error (${response.status}): ${errorText}`
        );
      }

      const result: FiboGenerationResponse = await response.json();

      // If the generation is async, poll for completion
      if (result.status === "pending" || result.status === "processing") {
        return await this.pollForCompletion(result.request_id, startTime);
      }

      // If completed immediately, return result
      if (result.status === "completed") {
        result.generation_time_ms = Date.now() - startTime;
        return result;
      }

      // If failed, throw error
      if (result.status === "failed") {
        throw new Error(`FIBO generation failed: ${result.error || "Unknown error"}`);
      }

      return result;
    } catch (error) {
      console.error("FIBO generation error:", error);
      throw error;
    }
  }

  /**
   * Poll for generation completion
   */
  private async pollForCompletion(
    requestId: string,
    startTime: number
  ): Promise<FiboGenerationResponse> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await this.sleep(this.pollIntervalMs);

      try {
        const response = await fetch(
          `${this.baseUrl}/image/status/${requestId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        );

        if (!response.ok) {
          console.warn(
            `Poll attempt ${attempt + 1} failed: ${response.status}`
          );
          continue;
        }

        const result: FiboGenerationResponse = await response.json();

        if (result.status === "completed") {
          result.generation_time_ms = Date.now() - startTime;
          return result;
        }

        if (result.status === "failed") {
          throw new Error(
            `FIBO generation failed: ${result.error || "Unknown error"}`
          );
        }

        // Continue polling if still processing
        console.log(
          `FIBO generation in progress... (attempt ${attempt + 1}/${this.maxPollAttempts})`
        );
      } catch (error) {
        console.error(`Poll attempt ${attempt + 1} error:`, error);
        // Continue polling unless it's the last attempt
        if (attempt === this.maxPollAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error(
      `FIBO generation timeout after ${this.maxPollAttempts * this.pollIntervalMs / 1000} seconds`
    );
  }

  /**
   * Validate structured prompt before sending to API
   */
  validateStructuredPrompt(prompt: FiboStructuredPrompt): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!prompt.short_description || prompt.short_description.length < 10) {
      errors.push("short_description must be at least 10 characters");
    }

    if (!prompt.objects || prompt.objects.length === 0) {
      errors.push("At least one object is required");
    }

    if (!prompt.background_setting) {
      errors.push("background_setting is required");
    }

    if (!prompt.text_render || prompt.text_render.length === 0) {
      errors.push("At least one text_render element is required");
    }

    if (!prompt.artistic_style) {
      errors.push("artistic_style is required");
    }

    // Check object structure
    prompt.objects?.forEach((obj, idx) => {
      if (!obj.description) {
        errors.push(`Object ${idx} missing description`);
      }
      if (!obj.location) {
        errors.push(`Object ${idx} missing location`);
      }
      if (!obj.shape_and_color) {
        errors.push(`Object ${idx} missing shape_and_color`);
      }
    });

    // Check text render structure
    prompt.text_render?.forEach((text, idx) => {
      if (!text.text) {
        errors.push(`TextRender ${idx} missing text content`);
      }
      if (!text.location) {
        errors.push(`TextRender ${idx} missing location`);
      }
      if (!text.font) {
        errors.push(`TextRender ${idx} missing font`);
      }
    });

    // Warn about text length (FIBO may struggle with very long text)
    prompt.text_render?.forEach((text, idx) => {
      if (text.text.length > 200) {
        console.warn(
          `TextRender ${idx} is very long (${text.text.length} chars). Consider breaking it up.`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get estimated generation time based on prompt complexity
   */
  estimateGenerationTime(prompt: FiboStructuredPrompt): number {
    // Base time: 15 seconds
    let estimatedSeconds = 15;

    // Add time for each object (1 second per object)
    estimatedSeconds += prompt.objects.length * 1;

    // Add time for each text element (0.5 seconds per text)
    estimatedSeconds += prompt.text_render.length * 0.5;

    // Add time for complex aesthetics
    if (
      prompt.aesthetics?.aesthetic_score === "very high" ||
      prompt.aesthetics?.preference_score === "very high"
    ) {
      estimatedSeconds += 5;
    }

    return Math.ceil(estimatedSeconds);
  }

  /**
   * Generate a random seed for reproducibility
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to FIBO API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error("FIBO connection test failed:", error);
      return false;
    }
  }
}

/**
 * Create a FIBO service instance from environment variables
 */
export function createFiboService(): FiboService {
  const apiKey = process.env.FIBO_API_KEY || process.env.BRIA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "FIBO_API_KEY or BRIA_API_KEY environment variable is required"
    );
  }

  const baseUrl = process.env.FIBO_API_URL || "https://api.fibo.com/v2";

  return new FiboService(apiKey, baseUrl);
}
