import { Client, Databases, Storage, ID, InputFile } from 'node-appwrite'
import axios from 'axios'
import { parseStringPromise } from 'xml2js'

// Environment variables
const {
  APPWRITE_FUNCTION_PROJECT_ID,
  APPWRITE_FUNCTION_API_ENDPOINT,
  APPWRITE_API_KEY,
  // DigitalOcean Gradient API Key (accept aliases used elsewhere in the repo)
  DO_GRADIENT_API_KEY,
  DIGITALOCEAN_API_KEY,
  DO_API_KEY,
  // DigitalOcean Model (accept alias)
  DO_GRADIENT_MODEL,
  DIGITALOCEAN_MODEL,
  FIBO_API_KEY,
  BRIA_API_KEY,
  FAL_KEY,
  DATABASE_ID = 'mitate-db',
  BUCKET_ID = 'poster-images',
} = process.env

const EFFECTIVE_DO_API_KEY = DO_GRADIENT_API_KEY || DIGITALOCEAN_API_KEY || DO_API_KEY
const EFFECTIVE_DO_MODEL =
  DO_GRADIENT_MODEL || DIGITALOCEAN_MODEL || 'meta-llama/llama-3-70b-instruct'

const EFFECTIVE_FIBO_API_KEY = FIBO_API_KEY || BRIA_API_KEY

// DigitalOcean Gradient Serverless Inference endpoint
const DO_GRADIENT_ENDPOINT = 'https://inference.do-ai.run/v1/chat/completions'

export default async ({ req, res, log, error: logError }) => {
  const client = new Client()
    .setEndpoint(APPWRITE_FUNCTION_API_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_API_KEY)

  const databases = new Databases(client)
  const storage = new Storage(client)

  let payload
  try {
    payload = JSON.parse(req.body || '{}')
  } catch (e) {
    return res.json({ error: 'Invalid JSON' }, 400)
  }

  const { requestId } = payload
  if (!requestId) {
    return res.json({ error: 'Missing requestId' }, 400)
  }

  log(`Starting processing for request: ${requestId}`)

  /**
   * Update request status in database
   */
  const updateStatus = async (status, errorMessage = null) => {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
      }
      if (errorMessage) updateData.error = errorMessage

      try {
        await databases.updateDocument(DATABASE_ID, 'requests', requestId, updateData)
      } catch (err) {
        // Some deployments don't have an `error` attribute on `requests`.
        // Retry without it so status updates still work.
        const msg = err?.message || ''
        if (updateData.error && /unknown attribute|invalid document/i.test(msg)) {
          const { error: _ignored, ...withoutError } = updateData
          await databases.updateDocument(DATABASE_ID, 'requests', requestId, withoutError)
        } else {
          throw err
        }
      }
      log(`Status updated to: ${status}`)
    } catch (err) {
      logError(`Failed to update status: ${err.message}`)
    }
  }

  try {
    // ============================================================
    // Step 1: Get Request Data
    // ============================================================
    const requestDoc = await databases.getDocument(
      DATABASE_ID,
      'requests',
      requestId,
    )
    const { query, query_type, knowledge_level } = requestDoc

    log(
      `Processing: query="${query}", type="${query_type}", level="${knowledge_level}"`,
    )

    // ============================================================
    // Step 2: Agent 1 - Paper Finder
    // ============================================================
    await updateStatus('finding_paper')

    let paperMetadata

    if (query_type === 'arxiv_link') {
      // Extract arXiv ID from URL
      const arxivId = extractArxivId(query)
      if (!arxivId) {
        throw new Error('Invalid ArXiv URL format')
      }
      paperMetadata = await fetchPaperMetadata(arxivId, log, logError)
    } else {
      // Search ArXiv for topic
      paperMetadata = await searchArxivByTopic(query, log, logError)
    }

    log(`Found paper: ${paperMetadata.title} (${paperMetadata.arxiv_id})`)

    // ============================================================
    // Step 3: Agent 2 - DigitalOcean Gradient AI Summarizer
    // ============================================================
    await updateStatus('summarizing')

    const summary = await summarizeWithDigitalOceanGradient(
      paperMetadata.abstract,
      paperMetadata.title,
      knowledge_level,
      log,
      logError,
    )

    log(`Summary generated with ${summary.key_concepts.length} concepts`)

    // ============================================================
    // Step 4: Agent 3 - Image Generation (Simplified for MVP)
    // ============================================================
    await updateStatus('generating_image')

    // For MVP, we'll use a placeholder or simple FIBO call
    // In production, this would use the full PosterGenerationOrchestrator
    let imageUrl

    if (EFFECTIVE_FIBO_API_KEY) {
      try {
        imageUrl = await generateWithFibo(
          summary,
          knowledge_level,
          log,
          logError,
        )
      } catch (fiboError) {
        log(`FIBO generation failed: ${fiboError.message}, using placeholder`)
        imageUrl = `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(summary.title)}`
      }
    } else {
      log('FIBO_API_KEY not set, using placeholder image')
      imageUrl = `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(summary.title)}`
    }

    log(`Image generated: ${imageUrl}`)

    // ============================================================
    // Step 5: Store Result
    // ============================================================
    const baseResultDoc = {
      request_id: requestId,
      arxiv_id: paperMetadata.arxiv_id,
      paper_title: paperMetadata.title,
      paper_url: paperMetadata.arxiv_url,
      summary_json: JSON.stringify(summary),
      image_url: imageUrl,
      image_storage_id: null, // Could upload to storage bucket here
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const extendedResultDoc = {
      ...baseResultDoc,
      fibo_structured_prompt: fiboMetadata.fibo_prompt
        ? JSON.stringify(fiboMetadata.fibo_prompt)
        : '',
      fibo_seed: fiboMetadata.fibo_seed || Math.floor(Math.random() * 1000000),
    }

    try {
      await databases.createDocument(DATABASE_ID, 'results', ID.unique(), extendedResultDoc)
    } catch (err) {
      // Some deployments have a minimal `results` schema (no fibo_* fields).
      // Retry with minimal fields so the pipeline still completes.
      const msg = err?.message || ''
      if (/unknown attribute|invalid document/i.test(msg)) {
        await databases.createDocument(DATABASE_ID, 'results', ID.unique(), baseResultDoc)
      } else {
        throw err
      }
    }

    await updateStatus('complete')

    log(`Processing complete for request: ${requestId}`)
    return res.json({ success: true }, 200)
  } catch (err) {
    logError(`Processing failed: ${err.message}`)
    await updateStatus('failed', err.message)
    return res.json({ error: err.message }, 500)
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Extract arXiv ID from URL
 */
function extractArxivId(url) {
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/)
  return match ? match[1] : null
}

/**
 * Fetch paper metadata by arXiv ID
 */
async function fetchPaperMetadata(arxivId, log, logError) {
  try {
    const response = await axios.get(
      `http://export.arxiv.org/api/query?id_list=${arxivId}`,
      { timeout: 10000 },
    )

    const parsed = await parseStringPromise(response.data)
    const entry = parsed.feed.entry?.[0]

    if (!entry) {
      throw new Error('Paper not found on ArXiv')
    }

    return {
      arxiv_id: arxivId,
      title: entry.title[0].trim(),
      abstract: entry.summary[0].trim(),
      authors: entry.author?.map((a) => a.name[0]).join(', ') || 'Unknown',
      published: entry.published[0],
      pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
      arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    }
  } catch (error) {
    logError(`Error fetching arXiv metadata: ${error.message}`)
    throw new Error(`Failed to fetch paper from ArXiv: ${error.message}`)
  }
}

/**
 * Search ArXiv by topic
 */
async function searchArxivByTopic(query, log, logError) {
  try {
    const response = await axios.get(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=1`,
      { timeout: 10000 },
    )

    const parsed = await parseStringPromise(response.data)
    const entry = parsed.feed.entry?.[0]

    if (!entry) {
      throw new Error('No papers found for this topic')
    }

    const idParts = entry.id[0].split('/')
    const arxivId = idParts[idParts.length - 1]

    return {
      arxiv_id: arxivId,
      title: entry.title[0].trim(),
      abstract: entry.summary[0].trim(),
      authors: entry.author?.map((a) => a.name[0]).join(', ') || 'Unknown',
      published: entry.published[0],
      pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
      arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    }
  } catch (error) {
    logError(`Error searching arXiv: ${error.message}`)
    throw new Error(`Failed to search ArXiv: ${error.message}`)
  }
}

/**
 * Summarize paper using DigitalOcean Gradient AI
 */
async function summarizeWithDigitalOceanGradient(
  abstract,
  title,
  knowledgeLevel,
  log,
  logError,
) {
  if (!EFFECTIVE_DO_API_KEY) {
    logError(
      'DigitalOcean Gradient API key not configured (set DO_GRADIENT_API_KEY or DIGITALOCEAN_API_KEY), using fallback',
    )
    return generateFallbackSummary(title, abstract, knowledgeLevel)
  }

  try {
    const prompt = buildSummarizationPrompt(abstract, title, knowledgeLevel)

    log('Calling DigitalOcean Gradient AI for summarization...')

    // Call DigitalOcean Gradient Serverless Inference API
    const response = await axios.post(
      DO_GRADIENT_ENDPOINT,
      {
        model: EFFECTIVE_DO_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at summarizing research papers for different knowledge levels. Always return valid JSON only, no markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${EFFECTIVE_DO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout
      },
    )

    const content = response.data.choices[0].message.content.trim()

    // Try to extract JSON if wrapped in markdown code blocks
    let jsonContent = content
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1]
    }

    const summary = JSON.parse(jsonContent)
    validateSummary(summary)

    return {
      title,
      ...summary,
    }
  } catch (error) {
    logError(`DigitalOcean Gradient AI error: ${error.message}`)
    log('Falling back to basic summary generation')
    return generateFallbackSummary(title, abstract, knowledgeLevel)
  }
}

/**
 * Build summarization prompt for DigitalOcean Gradient AI
 */
function buildSummarizationPrompt(abstract, title, knowledgeLevel) {
  const levelInstructions = {
    beginner: `
- Use simple, everyday language
- Explain concepts like you're talking to a 5th grader
- Use analogies and metaphors from daily life
- Avoid technical jargon
- Focus on "what" and "why" rather than "how"`,
    intermediate: `
- Use professional language with some technical terms
- Define technical terms when first used
- Balance between accessibility and precision
- Include practical implications
- Explain "how" things work at a high level`,
    advanced: `
- Use full technical vocabulary
- Include methodology details
- Discuss limitations and nuances
- Reference related work
- Focus on theoretical foundations and implications`,
  }

  return `You are summarizing the research paper titled "${title}" for a ${knowledgeLevel} audience.

${levelInstructions[knowledgeLevel]}

Paper Abstract:
"""
${abstract}
"""

Generate a JSON summary with the following structure:

{
  "one_liner": "A single sentence summary of the entire paper",
  "key_concepts": [
    {
      "name": "Concept Name",
      "explanation": "Explanation appropriate for ${knowledgeLevel} level (2-3 sentences)",
      "visual_metaphor": "A concrete, visual analogy or metaphor (e.g., 'a spotlight on a stage', 'building blocks stacking up')"
    }
  ],
  "key_finding": "The main result or contribution of the paper (1-2 sentences)",
  "real_world_impact": "How this research affects real applications or products (1-2 sentences)"
}

Requirements:
- Include 3-7 key concepts (most important ideas from the paper)
- Visual metaphors MUST be concrete and visualizable (for image generation)
- Adjust complexity to ${knowledgeLevel} level
- Return ONLY valid JSON, no markdown formatting, no additional text

JSON:`
}

/**
 * Validate summary structure
 */
function validateSummary(summary) {
  const required = [
    'one_liner',
    'key_concepts',
    'key_finding',
    'real_world_impact',
  ]

  for (const field of required) {
    if (!summary[field]) {
      throw new Error(`Missing required field: ${field}`)
    }
  }

  if (!Array.isArray(summary.key_concepts)) {
    throw new Error('key_concepts must be an array')
  }

  if (summary.key_concepts.length < 3 || summary.key_concepts.length > 7) {
    throw new Error('Must have 3-7 key concepts')
  }

  for (const concept of summary.key_concepts) {
    if (!concept.name || !concept.explanation || !concept.visual_metaphor) {
      throw new Error(
        'Each concept must have name, explanation, and visual_metaphor',
      )
    }
  }
}

/**
 * Generate fallback summary (when DigitalOcean Gradient AI unavailable)
 */
function generateFallbackSummary(title, abstract, knowledgeLevel) {
  const abstractSentences = abstract.split('. ').filter((s) => s.length > 20)

  return {
    title,
    one_liner:
      abstractSentences[0] ||
      'A research paper exploring new advances in the field',
    key_concepts: [
      {
        name: 'Main Approach',
        explanation:
          abstractSentences[1] || 'The paper introduces a novel methodology',
        visual_metaphor: 'a blueprint for building a new structure',
      },
      {
        name: 'Key Innovation',
        explanation:
          abstractSentences[2] ||
          'A new technique that improves upon existing methods',
        visual_metaphor: 'a new tool in a toolbox',
      },
      {
        name: 'Results',
        explanation:
          abstractSentences[3] || 'The approach shows promising results',
        visual_metaphor: 'a graph trending upward',
      },
    ],
    key_finding:
      abstractSentences[abstractSentences.length - 1] ||
      'This research advances the field',
    real_world_impact:
      'This work contributes to the advancement of research and technology',
  }
}

/**
 * Generate image with FIBO (simplified placeholder)
 */
async function generateWithFibo(summary, knowledgeLevel, log, logError) {
  // This is a simplified placeholder
  // In production, this would use the full PosterGenerationOrchestrator
  // from src/services/posterGenerationOrchestrator.ts

  log('FIBO integration: Using placeholder (full integration pending)')

  // Return placeholder that includes the paper title
  const encodedTitle = encodeURIComponent(summary.title.substring(0, 50))
  return `https://placehold.co/1024x1024/059669/white?text=${encodedTitle}`
}
