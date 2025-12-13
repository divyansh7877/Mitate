# DigitalOcean Gradient AI Platform Setup

**Last Updated:** 2025-12-13  
**Platform:** DigitalOcean Gradient AI Platform  
**API Type:** Serverless Inference REST API

---

## Overview

This project uses **DigitalOcean Gradient AI Platform** for AI-powered paper summarization. Specifically, we use the **Serverless Inference API** which provides access to various LLM models without managing infrastructure.

### What is DigitalOcean Gradient?

DigitalOcean Gradient is an AI platform that provides:
- **Serverless Inference** - Call AI models directly from code
- **Multiple Models** - OpenAI, Anthropic, Meta Llama, and more
- **Unified API** - One endpoint for all models
- **No Infrastructure** - Fully managed service

**Official Resources:**
- Platform: https://www.digitalocean.com/products/gradient/platform
- Documentation: https://docs.digitalocean.com/products/gradient-ai-platform/
- Serverless Inference Guide: https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference/

---

## API Integration Details

### Endpoint

```
POST https://inference.do-ai.run/v1/chat/completions
```

### Authentication

```bash
Authorization: Bearer YOUR_DO_GRADIENT_API_KEY
```

### Request Format

```json
{
  "model": "meta-llama/llama-3-70b-instruct",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert at summarizing research papers..."
    },
    {
      "role": "user",
      "content": "Summarize this paper: ..."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### Response Format

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "{ \"one_liner\": \"...\", \"key_concepts\": [...] }"
      }
    }
  ]
}
```

---

## Available Models

DigitalOcean Gradient provides access to multiple models. We use:

**Default Model:** `meta-llama/llama-3-70b-instruct`
- Large language model from Meta
- 70 billion parameters
- Optimized for instruction following
- Good balance of quality and speed

**Other Available Models:**
- OpenAI models (GPT-4, GPT-3.5)
- Anthropic Claude models
- Other open-source models (Mistral, DeepSeek, etc.)

**To Change Model:**
Set environment variable: `DO_GRADIENT_MODEL=different-model-id`

---

## Getting API Keys

### Step 1: Create DigitalOcean Account

1. Go to https://www.digitalocean.com
2. Sign up or log in
3. Navigate to Gradient AI Platform

### Step 2: Generate API Key

1. Go to **Gradient Platform Console**
2. Navigate to **API Keys** or **Settings**
3. Click **Create API Key** or **Generate Access Key**
4. Copy the key (shown only once!)
5. Set as `DO_GRADIENT_API_KEY` in environment variables

**Note:** Exact steps may vary as the platform is new (GA in January 2025)

---

## Implementation in Our Project

### Node.js Code (Appwrite Function)

```javascript
import axios from 'axios';

const DO_GRADIENT_ENDPOINT = 'https://inference.do-ai.run/v1/chat/completions';
const DO_GRADIENT_API_KEY = process.env.DO_GRADIENT_API_KEY;
const DO_GRADIENT_MODEL = process.env.DO_GRADIENT_MODEL || 'meta-llama/llama-3-70b-instruct';

async function summarizeWithDigitalOceanGradient(abstract, title, knowledgeLevel) {
  const response = await axios.post(
    DO_GRADIENT_ENDPOINT,
    {
      model: DO_GRADIENT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at summarizing research papers...'
        },
        {
          role: 'user',
          content: buildPrompt(abstract, title, knowledgeLevel)
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    },
    {
      headers: {
        'Authorization': `Bearer ${DO_GRADIENT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return JSON.parse(response.data.choices[0].message.content);
}
```

### Environment Variables Required

**Backend (Appwrite Functions):**
```bash
DO_GRADIENT_API_KEY=dop_v1_xxxxxxxxxxxxxxxxxxxxx
DO_GRADIENT_MODEL=meta-llama/llama-3-70b-instruct  # Optional, has default
```

**Frontend:**
No DigitalOcean Gradient credentials needed (backend only)

---

## Comparison: DigitalOcean Gradient vs gradient.ai

| Feature | DigitalOcean Gradient | gradient.ai |
|---------|----------------------|-------------|
| **Company** | DigitalOcean | Gradient AI (separate company) |
| **SDK** | Python only (official) | Node.js SDK available |
| **REST API** | ✅ Available | ✅ Available |
| **Models** | OpenAI, Anthropic, Meta, open-source | Proprietary + open-source |
| **Our Implementation** | ✅ Using REST API from Node.js | ❌ Not using |

---

## Testing the Integration

### Manual Test with cURL

```bash
curl -X POST https://inference.do-ai.run/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3-70b-instruct",
    "messages": [
      {"role": "user", "content": "Explain transformers in AI"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### Test in Appwrite Function

1. Deploy worker function with `DO_GRADIENT_API_KEY` set
2. Trigger with test request
3. Check logs for "Calling DigitalOcean Gradient AI..."
4. Verify response contains summary JSON

---

## Pricing

**As of January 2025:**
- DigitalOcean Gradient is in General Availability
- Pricing is per-token or per-request (check DigitalOcean pricing page)
- Unified billing across all models
- No separate vendor accounts needed

**Estimated Cost per Generation:**
- Llama-3-70B: ~$0.001-0.01 per summary
- Depends on prompt length and output tokens

**Official Pricing:**
https://www.digitalocean.com/pricing/gradient-platform

---

## Troubleshooting

### Error: "Unauthorized" or 401

**Problem:** Invalid or missing API key

**Solution:**
1. Verify `DO_GRADIENT_API_KEY` is set in Appwrite Function environment
2. Check key hasn't expired
3. Ensure key has proper permissions

### Error: "Model not found"

**Problem:** Invalid model ID

**Solution:**
1. Check `DO_GRADIENT_MODEL` value
2. Use one of the supported models
3. Default to `meta-llama/llama-3-70b-instruct`

### Error: Timeout

**Problem:** Request taking too long (>60s)

**Solution:**
1. Reduce `max_tokens` parameter
2. Simplify prompt
3. Check DigitalOcean status page for outages

### Fallback to Basic Summary

If DigitalOcean Gradient fails, the system automatically falls back to a basic summary extracted from the paper abstract. Check function logs for:
```
"DigitalOcean Gradient AI error: ..."
"Falling back to basic summary generation"
```

---

## Migration Notes

### From gradient.ai SDK to DigitalOcean Gradient

**Changes Made:**
1. ❌ Removed: `@gradientai/nodejs-sdk` dependency
2. ✅ Added: Direct REST API calls with axios
3. ✅ Changed: Authentication from `accessToken + workspaceId` to single `DO_GRADIENT_API_KEY`
4. ✅ Changed: Endpoint from gradient.ai to inference.do-ai.run

**Code Changes:**
```diff
- import Gradient from '@gradientai/nodejs-sdk';
+ // No SDK import needed, using axios

- const gradient = new Gradient({
-   accessToken: process.env.GRADIENT_ACCESS_TOKEN,
-   workspaceId: process.env.GRADIENT_WORKSPACE_ID
- });

+ const response = await axios.post(
+   'https://inference.do-ai.run/v1/chat/completions',
+   { model, messages, temperature, max_tokens },
+   { headers: { 'Authorization': `Bearer ${DO_GRADIENT_API_KEY}` } }
+ );
```

---

## References

- [DigitalOcean Gradient Platform](https://www.digitalocean.com/products/gradient/platform)
- [Serverless Inference Documentation](https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference/)
- [Gradient Platform GA Announcement](https://www.digitalocean.com/blog/gradient-platform-generally-available)
- [DigitalOcean API Reference](https://docs.digitalocean.com/reference/api/)

---

**Implementation Status:** ✅ Complete  
**Platform Version:** General Availability (GA)  
**Last Tested:** 2025-12-13
