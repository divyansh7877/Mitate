/**
 * LLM Service for Summary → FIBO Pipeline Compiler
 * Supports DigitalOcean AI (Llama 3.3 70B) with fallback to other providers
 */

export class LLMService {
    constructor(config) {
        this.config = config;
    }

    /**
     * Generate completion using the configured LLM
     */
    async generate(request) {
        switch (this.config.provider) {
            case "digitalocean":
                return this.generateDigitalOcean(request);
            case "openai":
                return this.generateOpenAI(request);
            case "anthropic":
                return this.generateAnthropic(request);
            default:
                throw new Error(`Unsupported provider: ${this.config.provider}`);
        }
    }

    /**
     * DigitalOcean AI (OpenAI-compatible endpoint)
     * Uses Llama 3.3 70B Instruct model
     */
    async generateDigitalOcean(request) {
        const baseUrl = this.config.baseUrl || "https://inference.do-ai.run/v1";
        const model = this.config.model || "llama3.3-70b-instruct";

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: request.systemPrompt,
                    },
                    {
                        role: "user",
                        content: request.userPrompt,
                    },
                ],
                temperature: request.temperature ?? 0.1, // Low temperature for deterministic output
                max_tokens: request.maxTokens ?? 8192, // Increased for longer compiler outputs
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DigitalOcean AI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        return {
            content: data.choices[0].message.content,
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
            model: data.model,
            finishReason: data.choices[0].finish_reason,
        };
    }

    /**
     * OpenAI API (for comparison/fallback)
     */
    async generateOpenAI(request) {
        const baseUrl = this.config.baseUrl || "https://api.openai.com/v1";
        const model = this.config.model || "gpt-4";

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: request.systemPrompt,
                    },
                    {
                        role: "user",
                        content: request.userPrompt,
                    },
                ],
                temperature: request.temperature ?? 0.1,
                max_tokens: request.maxTokens ?? 8192,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        return {
            content: data.choices[0].message.content,
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0,
            },
            model: data.model,
            finishReason: data.choices[0].finish_reason,
        };
    }

    /**
     * Anthropic API (Claude)
     */
    async generateAnthropic(request) {
        const baseUrl = this.config.baseUrl || "https://api.anthropic.com/v1";
        const model = this.config.model || "claude-3-5-sonnet-20241022";

        const response = await fetch(`${baseUrl}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.config.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: model,
                system: request.systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: request.userPrompt,
                    },
                ],
                temperature: request.temperature ?? 0.1,
                max_tokens: request.maxTokens ?? 8192,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        return {
            content: data.content[0].text,
            usage: {
                promptTokens: data.usage?.input_tokens || 0,
                completionTokens: data.usage?.output_tokens || 0,
                totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
            },
            model: data.model,
            finishReason: data.stop_reason,
        };
    }

    /**
     * Test connection to the LLM service
     */
    async testConnection() {
        try {
            const response = await this.generate({
                systemPrompt: "You are a helpful assistant.",
                userPrompt: "Say 'OK' if you can read this.",
                maxTokens: 10,
            });

            return response.content.toLowerCase().includes("ok");
        } catch (error) {
            console.error("LLM connection test failed:", error);
            return false;
        }
    }
}

/**
 * Factory function to create LLM service from environment variables
 */
export function createLLMService() {
    // Check for DigitalOcean AI credentials (primary)
    const doApiKey = process.env.DIGITALOCEAN_API_KEY || process.env.DO_API_KEY;
    if (doApiKey) {
        console.log("Using DigitalOcean AI (Llama 3.3 70B)");
        return new LLMService({
            provider: "digitalocean",
            apiKey: doApiKey,
            model: "llama3.3-70b-instruct",
        });
    }

    // Fallback to OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
        console.log("Using OpenAI (GPT-4) as fallback");
        return new LLMService({
            provider: "openai",
            apiKey: openaiApiKey,
            model: "gpt-4",
        });
    }

    // Fallback to Anthropic
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicApiKey) {
        console.log("Using Anthropic (Claude) as fallback");
        return new LLMService({
            provider: "anthropic",
            apiKey: anthropicApiKey,
            model: "claude-3-5-sonnet-20241022",
        });
    }

    throw new Error(
        "No LLM API key found. Set DIGITALOCEAN_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY"
    );
}
