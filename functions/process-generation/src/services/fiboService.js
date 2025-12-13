/**
 * FIBO (Bria AI) API Service
 * Handles structured prompt-based image generation
 */

export class FiboService {
    /**
     * @param {string} apiKey
     * @param {string} baseUrl
     */
    constructor(apiKey, baseUrl = "https://engine.prod.bria-api.com/v2") {
        if (!apiKey) {
            throw new Error("FIBO API key is required");
        }
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.maxPollAttempts = 150; // 150 attempts * 2s = 5 minutes max
        this.pollIntervalMs = 2000;
    }

    /**
     * Generate a poster using FIBO's structured prompt API
     * @param {Object} request
     * @returns {Promise<Object>}
     */
    async generatePoster(request) {
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
                    // Quality enhancement parameters from BRIA best practices
                    steps_num: 50, // 45-50 recommended, using max for best quality
                    enhance_image: true, // Apply post-processing for sharpness
                    guidance_scale: 5, // 3-5 range, default 5 for strong structured_prompt adherence
                    aspect_ratio: "1:1", // Square format for posters (modular mode uses explicit sizes)
                    fast: false, // Disable fast mode for higher quality
                    // Negative prompt to explicitly exclude text rendering issues
                    negative_prompt: "blurry text, illegible labels, distorted fonts, low contrast text, pixelated letters, unreadable text, fuzzy text edges, text artifacts, poor typography, unclear letters, smudged text, compressed text, watermark, low quality, amateur design, cluttered, messy",
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `FIBO API error (${response.status}): ${errorText}`
                );
            }

            const rawResult = await response.json();
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
     * @param {string} requestId
     * @param {number} startTime
     * @param {string} statusUrl
     * @returns {Promise<Object>}
     */
    async pollForCompletion(requestId, startTime, statusUrl) {
        for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
            await this.sleep(this.pollIntervalMs);

            try {
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

                const rawResult = await response.json();
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
     * @param {Object} prompt
     * @returns {{valid: boolean, errors: string[]}}
     */
    validateStructuredPrompt(prompt) {
        const errors = [];

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
        if (prompt.objects) {
            prompt.objects.forEach((obj, idx) => {
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
        }

        // Check text render structure
        if (prompt.text_render) {
            prompt.text_render.forEach((text, idx) => {
                if (!text.text) {
                    errors.push(`TextRender ${idx} missing text content`);
                }
                if (!text.location) {
                    errors.push(`TextRender ${idx} missing location`);
                }
                // font check is lenient here if undefined
            });
        }

        // Warn about text length (FIBO may struggle with very long text)
        if (prompt.text_render) {
            prompt.text_render.forEach((text, idx) => {
                if (text.text.length > 200) {
                    console.warn(
                        `TextRender ${idx} is very long (${text.text.length} chars). Consider breaking it up.`
                    );
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Get estimated generation time based on prompt complexity
     * @param {Object} prompt
     * @returns {number}
     */
    estimateGenerationTime(prompt) {
        // Base time: 15 seconds
        let estimatedSeconds = 15;

        // Add time for each object (1 second per object)
        if (prompt.objects) {
            estimatedSeconds += prompt.objects.length * 1;
        }

        // Add time for each text element (0.5 seconds per text)
        if (prompt.text_render) {
            estimatedSeconds += prompt.text_render.length * 0.5;
        }

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
    generateSeed() {
        return Math.floor(Math.random() * 1000000);
    }

    /**
     * Sleep utility
     * @param {number} ms 
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Test connection to FIBO API
     */
    async testConnection() {
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
 * @returns {FiboService}
 */
export function createFiboService() {
    const apiKey = process.env.FIBO_API_KEY || process.env.BRIA_API_KEY;

    if (!apiKey) {
        throw new Error(
            "FIBO_API_KEY or BRIA_API_KEY environment variable is required"
        );
    }

    const baseUrl = process.env.FIBO_API_URL || process.env.BRIA_API_URL || "https://engine.prod.bria-api.com/v2";

    return new FiboService(apiKey, baseUrl);
}
