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
  private maxPollAttempts: number = 150; // 150 attempts * 2s = 5 minutes max
  private pollIntervalMs: number = 2000;

  constructor(apiKey: string, baseUrl: string = "https://engine.prod.bria-api.com/v2") {
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
          "api_token": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structured_prompt: JSON.stringify(request.structured_prompt),
          seed: request.seed || this.generateSeed(),
          image_size: request.image_size || { width: 1024, height: 1024 },
          output_format: "png",
          sync: true,
          // Quality enhancement parameters from BRIA spec
          steps_num: 45, // 40-50 recommended for high quality
          enhance_image: true, // Apply post-processing for sharpness
          text_guidance_scale: 8.5, // 7.5-10 for strong prompt adherence and clear text
          aspect_ratio: "1:1", // Square for poster (can be "16:9" for wide infographics)
          fast: false, // Disable fast mode for higher quality
          // Negative prompt to avoid quality issues
          negative_prompt: "blurry text, low resolution, sloppy lines, illegible labels, pixelation, artifacts, distorted fonts, overcrowded layout, poor contrast, unreadable text, fuzzy edges, compression artifacts, jpeg artifacts, watermark, low quality, amateur design, cluttered, messy, unclear typography",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `FIBO API error (${response.status}): ${errorText}`
        );
      }

      const rawResult: any = await response.json();
      console.log("FIBO API Raw Response:", JSON.stringify(rawResult, null, 2));

      // Handle synchronous success (image returned immediately)
      if (rawResult.result && rawResult.result.image_url) {
        return {
          request_id: rawResult.request_id,
          status: "completed",
          image_url: rawResult.result.image_url,
          generation_time_ms: Date.now() - startTime,
        };
      }

      // Handle async response (status_url provided)
      const status = rawResult.status?.toUpperCase();
      if (status === "PENDING" || status === "PROCESSING" || status === "IN_PROGRESS" || (!status && rawResult.request_id)) {
        // Pass status_url if available
        return await this.pollForCompletion(rawResult.request_id, startTime, rawResult.status_url);
      }

      // If completed immediately but structure is different (fallback)
      if (status === "COMPLETED" || status === "COMPLETE") {
        return {
          request_id: rawResult.request_id,
          status: "completed",
          image_url: rawResult.result?.image_url || rawResult.image_url,
          generation_time_ms: Date.now() - startTime,
        };
      }

      // If failed, throw error
      if (status === "FAILED" || status === "ERROR") {
        throw new Error(`FIBO generation failed: ${rawResult.error || "Unknown error"}`);
      }

      throw new Error(`Unexpected FIBO response structure: ${JSON.stringify(rawResult)}`);
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
    startTime: number,
    statusUrl?: string
  ): Promise<FiboGenerationResponse> {
    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await this.sleep(this.pollIntervalMs);

      try {
        // Note: The previous log showed status_url as .../status/..., but typically result endpoint is needed? 
        // Actually, if status_url is provided, use it. 
        // If not, maybe /result/ is better? Or /status/?
        // The log showed: "status_url": ".../v2/status/..."
        // But previously I used /image/status/ which failed with 404.
        // Let's rely on statusUrl if possible. If not, default to /image/result/ which is common in Bria? 
        // Wait, Bria v2 usually has /v2/image/generate and result via webhook or GET.
        // If I use statusUrl provided by API it is safest.
        // If fallback is needed:
        // The error was 404 on .../image/status/...
        // Let's use statusUrl || `${this.baseUrl}/status/${requestId}` as seen in the response.

        const response = await fetch(
          statusUrl || `${this.baseUrl}/status/${requestId}`,
          {
            headers: {
              "api_token": this.apiKey,
            },
          }
        );

        if (!response.ok) {
          console.warn(
            `Poll attempt ${attempt + 1} failed: ${response.status}`
          );
          continue;
        }

        const rawResult: any = await response.json();
        const status = rawResult.status?.toUpperCase();

        if (status === "COMPLETED" || status === "COMPLETE") {
          return {
            request_id: requestId,
            status: "completed",
            image_url: rawResult.result?.image_url || rawResult.image_url,
            generation_time_ms: Date.now() - startTime,
          };
        }

        if (status === "FAILED" || status === "ERROR") {
          throw new Error(
            `FIBO generation failed: ${rawResult.error || "Unknown error"}`
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
      // Use a minimal generation request to verify the API key since there is no /health endpoint
      const response = await fetch(`${this.baseUrl}/image/generate`, {
        method: "POST",
        headers: {
          "api_token": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "test connection",
          sync: true,
        }),
      });

      if (!response.ok) {
        try {
          const errorText = await response.text();
          console.error(`FIBO connection test failed (${response.status}): ${errorText}`);
        } catch (e) {
          console.error(`FIBO connection test failed (${response.status})`);
        }
      }

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

  const baseUrl = process.env.FIBO_API_URL || process.env.BRIA_API_URL || "https://engine.prod.bria-api.com/v2";

  return new FiboService(apiKey, baseUrl);
}
