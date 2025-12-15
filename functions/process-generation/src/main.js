import { Client, Databases, Storage, ID } from 'node-appwrite';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

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
  // Generation mode: "infographic" (default) or "simple_visuals"
  GENERATION_MODE = 'infographic',
} = process.env;

const EFFECTIVE_DO_API_KEY =
  DO_GRADIENT_API_KEY || DIGITALOCEAN_API_KEY || DO_API_KEY;
const EFFECTIVE_DO_MODEL =
  DO_GRADIENT_MODEL || DIGITALOCEAN_MODEL || 'llama3.3-70b-instruct';

const EFFECTIVE_FIBO_API_KEY = FIBO_API_KEY || BRIA_API_KEY;

// DigitalOcean Gradient Serverless Inference endpoint
const DO_GRADIENT_ENDPOINT = 'https://inference.do-ai.run/v1/chat/completions';

export default async ({ req, res, log, error: logError }) => {
  const client = new Client()
    .setEndpoint(
      APPWRITE_FUNCTION_API_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1'
    )
    .setProject(APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);
  const storage = new Storage(client);

  let payload;
  try {
    payload = JSON.parse(req.body || '{}');
  } catch (e) {
    return res.json({ error: 'Invalid JSON' }, 400);
  }

  const { requestId } = payload;
  if (!requestId) {
    return res.json({ error: 'Missing requestId' }, 400);
  }

  log(`Starting processing for request: ${requestId}`);

  /**
   * Update request status in database
   */
  const updateStatus = async (status, errorMessage = null) => {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (errorMessage) updateData.error = errorMessage;

      try {
        await databases.updateDocument(
          DATABASE_ID,
          'requests',
          requestId,
          updateData
        );
      } catch (err) {
        // Some deployments don't have an `error` attribute on `requests`.
        // Retry without it so status updates still work.
        const msg = err?.message || '';
        if (
          updateData.error &&
          /unknown attribute|invalid document/i.test(msg)
        ) {
          const { error: _ignored, ...withoutError } = updateData;
          await databases.updateDocument(
            DATABASE_ID,
            'requests',
            requestId,
            withoutError
          );
        } else {
          throw err;
        }
      }
      log(`Status updated to: ${status}`);
    } catch (err) {
      logError(`Failed to update status: ${err.message}`);
    }
  };

  try {
    // ============================================================
    // Step 1: Get Request Data
    // ============================================================
    const requestDoc = await databases.getDocument(
      DATABASE_ID,
      'requests',
      requestId
    );
    const { query, query_type, knowledge_level } = requestDoc;

    log(
      `Processing: query="${query}", type="${query_type}", level="${knowledge_level}"`
    );

    // ============================================================
    // Step 2: Agent 1 - Paper Finder
    // ============================================================
    await updateStatus('finding_paper');

    let paperMetadata;

    if (query_type === 'arxiv_link') {
      // Extract arXiv ID from URL
      const arxivId = extractArxivId(query);
      if (!arxivId) {
        throw new Error('Invalid ArXiv URL format');
      }
      paperMetadata = await fetchPaperMetadata(arxivId, log, logError);
    } else {
      // Search ArXiv for topic
      paperMetadata = await searchArxivByTopic(query, log, logError);
    }

    log(`Found paper: ${paperMetadata.title} (${paperMetadata.arxiv_id})`);

    // ============================================================
    // Step 3: Agent 2 - DigitalOcean Gradient AI Summarizer
    // ============================================================
    await updateStatus('summarizing');

    const summary = await summarizeWithDigitalOceanGradient(
      paperMetadata.abstract,
      paperMetadata.title,
      knowledge_level,
      log,
      logError
    );

    log(`Summary generated with ${summary.key_concepts.length} concepts`);

    // ============================================================
    // Step 4: Agent 3 - Image Generation
    // ============================================================
    await updateStatus('generating_image');

    let imageUrl;
    let conceptImages = null; // For simple_visuals mode
    let fiboMetadata = {
      fibo_prompt: null,
      fibo_seed: Math.floor(Math.random() * 1000000),
    };

    log(`FIBO_API_KEY check: ${EFFECTIVE_FIBO_API_KEY ? 'SET' : 'NOT SET'}`);
    log(`GENERATION_MODE: ${GENERATION_MODE}`);

    if (EFFECTIVE_FIBO_API_KEY) {
      log('FIBO_API_KEY is set, attempting to generate image with FIBO...');

      if (GENERATION_MODE === 'simple_visuals') {
        // New flow: Generate one simple image per key concept
        log('Using simple_visuals mode - generating one image per concept...');
        try {
          conceptImages = await generateSimpleVisuals(
            summary,
            knowledge_level,
            log,
            logError
          );
          log(`Generated ${conceptImages.length} concept images`);
          // Set primary image to first concept image for backward compatibility
          imageUrl =
            conceptImages[0]?.image_url ||
            `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(summary.title)}`;
          fiboMetadata.generation_mode = 'simple_visuals';
        } catch (fiboError) {
          logError(`Simple visuals generation failed: ${fiboError.message}`);
          logError(`Error stack: ${fiboError.stack}`);
          log('Falling back to placeholder images');
          imageUrl = `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(summary.title)}`;
          // Create placeholder concept images
          conceptImages = summary.key_concepts.map((concept, idx) => ({
            concept_name: concept.name,
            image_url: `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(concept.name)}`,
          }));
        }
      } else {
        // Original flow: Single complex infographic
        try {
          log('Using infographic mode - generating single complex image...');
          const result = await generateWithFibo(
            summary,
            knowledge_level,
            log,
            logError
          );
          log(`FIBO result received: ${JSON.stringify(result)}`);
          imageUrl = result.imageUrl;
          fiboMetadata = result.metadata;
          log(`FIBO generation successful! Image URL: ${imageUrl}`);
        } catch (fiboError) {
          logError(`FIBO generation failed with error: ${fiboError.message}`);
          logError(`FIBO error stack: ${fiboError.stack}`);
          log(`Using placeholder due to FIBO error`);
          imageUrl = `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(summary.title)}`;
        }
      }
    } else {
      log('FIBO_API_KEY not set, using placeholder image');
      imageUrl = `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(summary.title)}`;

      if (GENERATION_MODE === 'simple_visuals') {
        // Create placeholder concept images
        conceptImages = summary.key_concepts.map((concept) => ({
          concept_name: concept.name,
          image_url: `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(concept.name)}`,
        }));
      }
    }

    log(`Final image URL: ${imageUrl}`);
    if (conceptImages) {
      log(`Concept images: ${JSON.stringify(conceptImages)}`);
    }

    // ============================================================
    // Step 5: Store Result
    // ============================================================
    // Add image_url to summary since it might not be a separate field in the schema
    const summaryWithImage = {
      ...summary,
      image_url: imageUrl,
    };

    // Minimal schema that all deployments should have
    const minimalResultDoc = {
      request_id: requestId,
      arxiv_id: paperMetadata.arxiv_id,
      paper_title: paperMetadata.title,
      paper_url: paperMetadata.arxiv_url,
      summary_json: JSON.stringify(summaryWithImage),
    };

    // Extended schema with additional fields
    const extendedResultDoc = {
      ...minimalResultDoc,
      image_url: imageUrl,
      image_storage_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fibo_structured_prompt: fiboMetadata.fibo_prompt
        ? JSON.stringify(fiboMetadata.fibo_prompt)
        : '',
      fibo_seed: fiboMetadata.fibo_seed || Math.floor(Math.random() * 1000000),
      // Include concept_images for simple_visuals mode
      concept_images: conceptImages ? JSON.stringify(conceptImages) : null,
    };

    try {
      await databases.createDocument(
        DATABASE_ID,
        'results',
        ID.unique(),
        extendedResultDoc
      );
    } catch (err) {
      // Some deployments have a minimal `results` schema.
      // Retry with minimal fields so the pipeline still completes.
      const msg = err?.message || '';
      if (/unknown attribute|invalid document/i.test(msg)) {
        await databases.createDocument(
          DATABASE_ID,
          'results',
          ID.unique(),
          minimalResultDoc
        );
      } else {
        throw err;
      }
    }

    await updateStatus('complete');

    log(`Processing complete for request: ${requestId}`);
    return res.json({ success: true }, 200);
  } catch (err) {
    logError(`Processing failed: ${err.message}`);
    await updateStatus('failed', err.message);
    return res.json({ error: err.message }, 500);
  }
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Extract arXiv ID from URL
 */
function extractArxivId(url) {
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch paper metadata by arXiv ID
 */
async function fetchPaperMetadata(arxivId, log, logError) {
  try {
    const response = await axios.get(
      `http://export.arxiv.org/api/query?id_list=${arxivId}`,
      { timeout: 10000 }
    );

    const parsed = await parseStringPromise(response.data);
    const entry = parsed.feed.entry?.[0];

    if (!entry) {
      throw new Error('Paper not found on ArXiv');
    }

    return {
      arxiv_id: arxivId,
      title: entry.title[0].trim(),
      abstract: entry.summary[0].trim(),
      authors: entry.author?.map((a) => a.name[0]).join(', ') || 'Unknown',
      published: entry.published[0],
      pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
      arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    };
  } catch (error) {
    logError(`Error fetching arXiv metadata: ${error.message}`);
    throw new Error(`Failed to fetch paper from ArXiv: ${error.message}`);
  }
}

/**
 * Search ArXiv by topic
 */
async function searchArxivByTopic(query, log, logError) {
  try {
    const response = await axios.get(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=1`,
      { timeout: 10000 }
    );

    const parsed = await parseStringPromise(response.data);
    const entry = parsed.feed.entry?.[0];

    if (!entry) {
      throw new Error('No papers found for this topic');
    }

    const idParts = entry.id[0].split('/');
    const arxivId = idParts[idParts.length - 1];

    return {
      arxiv_id: arxivId,
      title: entry.title[0].trim(),
      abstract: entry.summary[0].trim(),
      authors: entry.author?.map((a) => a.name[0]).join(', ') || 'Unknown',
      published: entry.published[0],
      pdf_url: `https://arxiv.org/pdf/${arxivId}.pdf`,
      arxiv_url: `https://arxiv.org/abs/${arxivId}`,
    };
  } catch (error) {
    logError(`Error searching arXiv: ${error.message}`);
    throw new Error(`Failed to search ArXiv: ${error.message}`);
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
  logError
) {
  if (!EFFECTIVE_DO_API_KEY) {
    logError(
      'DigitalOcean Gradient API key not configured (set DO_GRADIENT_API_KEY or DIGITALOCEAN_API_KEY), using fallback'
    );
    return generateFallbackSummary(title, abstract, knowledgeLevel);
  }

  try {
    const prompt = buildSummarizationPrompt(abstract, title, knowledgeLevel);

    log('Calling DigitalOcean Gradient AI for summarization...');
    log(`Using model: ${EFFECTIVE_DO_MODEL}`);
    log(`API endpoint: ${DO_GRADIENT_ENDPOINT}`);

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
      }
    );

    const content = response.data.choices[0].message.content.trim();

    // Try to extract JSON if wrapped in markdown code blocks
    let jsonContent = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    }

    const summary = JSON.parse(jsonContent);
    validateSummary(summary);

    return {
      title,
      ...summary,
    };
  } catch (error) {
    logError(`DigitalOcean Gradient AI error: ${error.message}`);
    if (error.response) {
      logError(`DO API status: ${error.response.status}`);
      logError(`DO API error data: ${JSON.stringify(error.response.data)}`);
    }
    log('Falling back to basic summary generation');
    return generateFallbackSummary(title, abstract, knowledgeLevel);
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
  };

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

JSON:`;
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
  ];

  for (const field of required) {
    if (!summary[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(summary.key_concepts)) {
    throw new Error('key_concepts must be an array');
  }

  if (summary.key_concepts.length < 3 || summary.key_concepts.length > 7) {
    throw new Error('Must have 3-7 key concepts');
  }

  for (const concept of summary.key_concepts) {
    if (!concept.name || !concept.explanation || !concept.visual_metaphor) {
      throw new Error(
        'Each concept must have name, explanation, and visual_metaphor'
      );
    }
  }
}

/**
 * Generate fallback summary (when DigitalOcean Gradient AI unavailable)
 */
function generateFallbackSummary(title, abstract, knowledgeLevel) {
  const abstractSentences = abstract.split('. ').filter((s) => s.length > 20);

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
  };
}

/**
 * Generate image with FIBO API
 */
async function generateWithFibo(summary, knowledgeLevel, log, logError) {
  const FIBO_API_KEY = process.env.FIBO_API_KEY || process.env.BRIA_API_KEY;
  const FIBO_BASE_URL =
    process.env.FIBO_API_URL || 'https://engine.prod.bria-api.com/v2';

  if (!FIBO_API_KEY) {
    throw new Error('FIBO_API_KEY not configured');
  }

  log('Generating image with FIBO API...');

  // Build a simple structured prompt
  const structuredPrompt = buildSimpleStructuredPrompt(summary, knowledgeLevel);
  const seed = Math.floor(Math.random() * 1000000);

  try {
    log(`Calling FIBO with seed: ${seed}`);
    log(
      `Structured prompt preview: ${JSON.stringify(structuredPrompt).substring(0, 500)}...`
    );

    const response = await axios.post(
      `${FIBO_BASE_URL}/image/generate`,
      {
        structured_prompt: JSON.stringify(structuredPrompt),
        seed: seed,
        image_size: { width: 1024, height: 1024 },
        output_format: 'png',
        sync: true,
        steps_num: 50,
        enhance_image: true,
        guidance_scale: 5,
        aspect_ratio: '1:1',
        fast: false,
        negative_prompt:
          'blurry text, illegible labels, distorted fonts, low contrast text, pixelated letters, unreadable text, fuzzy text edges, text artifacts, poor typography, unclear letters, smudged text, compressed text, watermark, low quality, amateur design, cluttered, messy',
      },
      {
        headers: {
          api_token: FIBO_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minute timeout
      }
    );

    log('FIBO API response received');

    // Handle synchronous success
    if (response.data.result && response.data.result.image_url) {
      log(
        `FIBO image generated successfully: ${response.data.result.image_url}`
      );
      return {
        imageUrl: response.data.result.image_url,
        metadata: {
          fibo_prompt: structuredPrompt,
          fibo_seed: seed,
        },
      };
    }

    // Handle async response (needs polling)
    const status = response.data.status?.toUpperCase();
    if (
      status === 'PENDING' ||
      status === 'PROCESSING' ||
      status === 'IN_PROGRESS'
    ) {
      log('FIBO generation started, polling for completion...');
      const requestId = response.data.request_id;
      const statusUrl = response.data.status_url;

      // Poll for completion (max 2 minutes)
      const imageUrl = await pollFiboCompletion(
        requestId,
        statusUrl,
        FIBO_API_KEY,
        FIBO_BASE_URL,
        log
      );

      return {
        imageUrl,
        metadata: {
          fibo_prompt: structuredPrompt,
          fibo_seed: seed,
        },
      };
    }

    throw new Error(
      `Unexpected FIBO response: ${JSON.stringify(response.data)}`
    );
  } catch (error) {
    logError(`FIBO generation failed: ${error.message}`);
    if (error.response) {
      logError(`FIBO error status: ${error.response.status}`);
      logError(`FIBO error data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Poll FIBO API for completion
 */
async function pollFiboCompletion(requestId, statusUrl, apiKey, baseUrl, log) {
  const maxAttempts = 60; // 60 attempts * 2s = 2 minutes max
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    try {
      const response = await axios.get(
        statusUrl || `${baseUrl}/status/${requestId}`,
        {
          headers: {
            api_token: apiKey,
          },
          timeout: 10000,
        }
      );

      const status = response.data.status?.toUpperCase();

      if (status === 'COMPLETED' || status === 'COMPLETE') {
        const imageUrl =
          response.data.result?.image_url || response.data.image_url;
        log(`FIBO generation completed: ${imageUrl}`);
        return imageUrl;
      }

      if (status === 'FAILED' || status === 'ERROR') {
        throw new Error(
          `FIBO generation failed: ${response.data.error || 'Unknown error'}`
        );
      }

      log(`FIBO generation in progress... (${attempt + 1}/${maxAttempts})`);
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      log(`Poll attempt ${attempt + 1} error: ${error.message}`);
    }
  }

  throw new Error('FIBO generation timeout after 2 minutes');
}

/**
 * Calculate optimal layout based on content and knowledge level
 */
function calculateLayout(numConcepts, knowledgeLevel) {
  const headerHeight = 15;
  const footerHeight = 10;
  const availableHeight = 100 - headerHeight - footerHeight;

  // Use vertical flow for simplicity in serverless function
  const conceptHeight = availableHeight / numConcepts;

  const sections = [
    {
      height_percentage: headerHeight,
      position: { x: 'center', y: '0%' },
      content_type: 'header',
    },
  ];

  // Add concept sections
  for (let i = 0; i < numConcepts; i++) {
    sections.push({
      height_percentage: conceptHeight,
      position: {
        x: 'center',
        y: `${headerHeight + i * conceptHeight}%`,
      },
      content_type: 'concept',
    });
  }

  // Add footer
  sections.push({
    height_percentage: footerHeight,
    position: { x: 'center', y: `${100 - footerHeight}%` },
    content_type: 'footer',
  });

  return {
    type: 'vertical_flow',
    sections,
    margins: { top: 5, right: 10, bottom: 5, left: 10 },
    spacing: 2,
  };
}

/**
 * Select color scheme based on knowledge level
 */
function selectColorScheme(knowledgeLevel) {
  const schemes = {
    beginner: {
      primary: '#4299E1',
      secondary: '#9F7AEA',
      accent: '#48BB78',
      background: '#FFFFFF',
      text: '#2D3748',
    },
    intermediate: {
      primary: '#2C5282',
      secondary: '#2C7A7B',
      accent: '#D69E2E',
      background: '#F7FAFC',
      text: '#1A202C',
    },
    advanced: {
      primary: '#1A365D',
      secondary: '#2D3748',
      accent: '#4A5568',
      background: '#EDF2F7',
      text: '#000000',
    },
  };
  return schemes[knowledgeLevel] || schemes.beginner;
}

/**
 * Build a structured prompt for FIBO using layout engine logic
 */
function buildSimpleStructuredPrompt(summary, knowledgeLevel) {
  const concepts = summary.key_concepts || [];
  const layout = calculateLayout(concepts.length, knowledgeLevel);
  const colorScheme = selectColorScheme(knowledgeLevel);

  const levelDescriptor = {
    beginner:
      'friendly and approachable with simple visual metaphors, suitable for general audience',
    intermediate:
      'professional and technical with diagrams and practical examples, for engineers and practitioners',
    advanced:
      'academic and dense with mathematical notation and detailed methodology, for researchers',
  };

  // Build objects array
  const objects = [];

  // Header object
  const headerSection = layout.sections.find(
    (s) => s.content_type === 'header'
  );
  if (headerSection) {
    objects.push({
      description: `Main header banner section containing the title "${summary.title}" in LARGE, BOLD, CRYSTAL-CLEAR typography. Ultra-professional design with sharp edges and high contrast. All text must be perfectly legible and sharp.`,
      location: `top-center, starting at ${headerSection.position.y}`,
      relationship: 'Primary visual anchor, introduces the research topic',
      relative_size: `${headerSection.height_percentage}% of total vertical space`,
      shape_and_color: `Rounded rectangle banner with gradient from ${colorScheme.primary} to ${colorScheme.secondary}, high contrast white text`,
      texture:
        'flat vector-style with subtle gradient, perfectly smooth finish',
      appearance_details:
        'Razor-sharp edges, modern sans-serif typography, professional polish',
      orientation: 'horizontal banner spanning full width',
    });
  }

  // Concept objects
  const conceptSections = layout.sections.filter(
    (s) => s.content_type === 'concept'
  );
  concepts.forEach((concept, idx) => {
    if (conceptSections[idx]) {
      const section = conceptSections[idx];
      const visualMetaphor = concept.visual_metaphor || concept.name;

      objects.push({
        description: `Section visualizing "${concept.name}" as: ${visualMetaphor}. Clean, sharp visual with crystal-clear typography. Professional illustration style.`,
        location: `${section.position.y} from top, ${section.position.x} horizontally`,
        relationship: `Concept ${idx + 1} of ${concepts.length}, sequentially connected`,
        relative_size: `${section.height_percentage}% of vertical space`,
        shape_and_color: `Clean rounded container with light background, accent colors from ${colorScheme.accent}, sharp edges`,
        texture: 'flat vector illustration style with subtle depth',
        appearance_details: `Large numbered label '${idx + 1}' in circle, excellent visual hierarchy with sharp text rendering`,
        orientation: 'horizontal section with internal layout',
      });
    }
  });

  // Footer object
  const footerSection = layout.sections.find(
    (s) => s.content_type === 'footer'
  );
  if (footerSection) {
    objects.push({
      description: `Footer section with key takeaway: "${summary.key_finding}" and source attribution. Professional citation format.`,
      location: `bottom of infographic, ${footerSection.position.y}`,
      relationship: 'Concluding section summarizing main insight',
      relative_size: `${footerSection.height_percentage}% of vertical space`,
      shape_and_color: `Rounded rectangle with background ${colorScheme.primary}, white text for high contrast`,
      texture: 'flat, solid color',
      appearance_details: 'Key finding prominently displayed with citation',
      orientation: 'horizontal footer spanning full width',
    });
  }

  // Build text_render array
  const textElements = [
    {
      text: summary.title.toUpperCase(),
      location: 'top-center',
      size: 'large within frame',
      color: '#FFFFFF',
      font: 'bold sans-serif',
      appearance_details:
        'OVERLAY TEXT LAYER: Large, bold, all caps title. Render as vector/overlay text on top of background, NOT diffusion-generated. High contrast white text with crisp edges, 72pt equivalent.',
    },
    {
      text: summary.one_liner,
      location: 'top-center, below title',
      size: 'medium',
      color: '#FFFFFF',
      font: 'sans-serif',
      appearance_details:
        'OVERLAY TEXT LAYER: Subtitle rendered as vector overlay. White text with 95% opacity, 24pt equivalent.',
    },
  ];

  // Add concept text elements
  concepts.forEach((concept, idx) => {
    const truncatedExplanation =
      concept.explanation.length > 150
        ? concept.explanation.substring(0, 147) + '...'
        : concept.explanation;

    textElements.push({
      text: `${idx + 1}. ${concept.name.toUpperCase()}`,
      location: `section ${idx + 1}, left-aligned`,
      size: 'large',
      color: colorScheme.text,
      font: 'bold sans-serif',
      appearance_details:
        'OVERLAY TEXT LAYER: Bold heading. Sharp overlay text at 28pt equivalent with high contrast.',
    });

    textElements.push({
      text: truncatedExplanation,
      location: `section ${idx + 1}, below heading`,
      size: 'medium',
      color: colorScheme.text,
      font: 'sans-serif',
      appearance_details:
        'OVERLAY TEXT LAYER: Body text at 16pt equivalent with line height 1.6. Sharp rendering, max width 80%.',
    });
  });

  // Add footer text
  const truncatedFinding =
    summary.key_finding && summary.key_finding.length > 100
      ? summary.key_finding.substring(0, 97) + '...'
      : summary.key_finding || summary.real_world_impact;

  textElements.push({
    text: `KEY INSIGHT: ${truncatedFinding}`,
    location: 'bottom-center',
    size: 'large',
    color: '#FFFFFF',
    font: 'bold sans-serif',
    appearance_details:
      'OVERLAY TEXT LAYER: Bold callout at 20pt equivalent. High contrast white text with sharp rendering.',
  });

  return {
    short_description: `A HIGH-RESOLUTION, professional-quality educational infographic explaining "${summary.title}". The design uses a ${layout.type} layout with ${concepts.length} main concept sections. Style is ${levelDescriptor[knowledgeLevel]}. CRITICAL: This uses OVERLAY TEXT RENDERING - all text elements should be treated as vector overlays, NOT diffusion-generated text. Text must be crystal clear, sharp, and fully legible. Print-ready quality.`,
    background_setting: `Clean ${colorScheme.background} background with minimal texture. ${knowledgeLevel === 'beginner' ? 'Bright and welcoming' : knowledgeLevel === 'intermediate' ? 'Professional with subtle grid' : 'Academic and minimal'}. PERFECTLY SMOOTH with no artifacts.`,
    objects: objects,
    text_render: textElements,
    lighting: {
      conditions: 'bright, even studio lighting',
      direction: 'soft, diffused lighting from multiple sources',
      shadows: 'Minimal, soft shadows for depth separation only',
    },
    aesthetics: {
      composition: `${layout.type} layout with clear hierarchy and ${layout.margins.top}% margins`,
      color_scheme: `Primary: ${colorScheme.primary}, Accent: ${colorScheme.accent}, Background: ${colorScheme.background}`,
      mood_atmosphere: `${knowledgeLevel === 'beginner' ? 'Educational, approachable, friendly, inspiring' : knowledgeLevel === 'intermediate' ? 'Professional, trustworthy, modern, practical' : 'Scholarly, authoritative, rigorous, intellectual'}`,
      preference_score: 'very high',
      aesthetic_score: 'very high',
    },
    photographic_characteristics: {
      depth_of_field: 'deep',
      focus: 'sharp focus on all elements',
      camera_angle: 'eye-level',
      lens_focal_length: 'standard lens (e.g., 50mm)',
    },
    style_medium: 'digital illustration',
    context: `This is an educational infographic designed for ${knowledgeLevel === 'beginner' ? 'general audience with no technical background' : knowledgeLevel === 'intermediate' ? 'engineers and practitioners' : 'researchers and academics'}, intended for social media sharing, presentations, and teaching materials.`,
    artistic_style: `${knowledgeLevel === 'beginner' ? 'minimalist, modern infographic, flat design, friendly illustration, colorful' : knowledgeLevel === 'intermediate' ? 'professional infographic, technical illustration, clean design, modern' : 'academic infographic, scholarly design, precise diagrams, journal-quality, muted colors'}, SHARP LINES, HIGH RESOLUTION, crystal-clear text, professional quality, print-ready`,
  };
}

// ============================================================
// Simple Visuals Mode Functions
// ============================================================

/**
 * Generate simple visual images for each key concept (no text burned in)
 */
async function generateSimpleVisuals(summary, knowledgeLevel, log, logError) {
  const FIBO_API_KEY = process.env.FIBO_API_KEY || process.env.BRIA_API_KEY;
  const FIBO_BASE_URL =
    process.env.FIBO_API_URL || 'https://engine.prod.bria-api.com/v2';

  if (!FIBO_API_KEY) {
    throw new Error('FIBO_API_KEY not configured');
  }

  const conceptImages = [];
  const concepts = summary.key_concepts || [];

  log(`Generating ${concepts.length} simple visual images...`);

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    log(
      `Generating image ${i + 1}/${concepts.length} for concept: ${concept.name}`
    );

    try {
      const structuredPrompt = buildSimpleVisualPrompt(
        concept,
        knowledgeLevel,
        i
      );
      const seed = Math.floor(Math.random() * 1000000);

      log(`Calling FIBO for concept "${concept.name}" with seed: ${seed}`);

      const response = await axios.post(
        `${FIBO_BASE_URL}/image/generate`,
        {
          structured_prompt: JSON.stringify(structuredPrompt),
          seed: seed,
          image_size: { width: 1024, height: 1024 },
          output_format: 'png',
          sync: true,
          steps_num: 50,
          enhance_image: true,
          guidance_scale: 5,
          aspect_ratio: '1:1',
          fast: false,
          negative_prompt:
            'text, words, letters, numbers, labels, captions, titles, subtitles, watermark, signature, logo, busy background, complex details, cluttered, photorealistic, blurry, low quality, amateur',
        },
        {
          headers: {
            api_token: FIBO_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minute timeout per image
        }
      );

      let imageUrl;

      // Handle synchronous success
      if (response.data.result && response.data.result.image_url) {
        imageUrl = response.data.result.image_url;
        log(`Image ${i + 1} generated: ${imageUrl}`);
      } else {
        // Handle async response (needs polling)
        const status = response.data.status?.toUpperCase();
        if (
          status === 'PENDING' ||
          status === 'PROCESSING' ||
          status === 'IN_PROGRESS'
        ) {
          log(`Image ${i + 1} started async, polling for completion...`);
          const requestId = response.data.request_id;
          const statusUrl = response.data.status_url;
          imageUrl = await pollFiboCompletion(
            requestId,
            statusUrl,
            FIBO_API_KEY,
            FIBO_BASE_URL,
            log
          );
        } else {
          throw new Error(
            `Unexpected FIBO response: ${JSON.stringify(response.data)}`
          );
        }
      }

      conceptImages.push({
        concept_name: concept.name,
        image_url: imageUrl,
      });
    } catch (error) {
      logError(
        `Failed to generate image for concept "${concept.name}": ${error.message}`
      );
      // Use placeholder for failed concepts
      conceptImages.push({
        concept_name: concept.name,
        image_url: `https://placehold.co/1024x1024/059669/white?text=${encodeURIComponent(concept.name)}`,
      });
    }
  }

  log(`Generated ${conceptImages.length} concept images`);
  return conceptImages;
}

/**
 * Build a simple visual prompt for a single concept (no text)
 */
function buildSimpleVisualPrompt(concept, knowledgeLevel, index) {
  const colorScheme = selectColorScheme(knowledgeLevel);

  const levelStyle = {
    beginner: 'friendly, colorful, playful, approachable',
    intermediate: 'professional, clean, modern, technical',
    advanced: 'scholarly, precise, detailed, academic',
  };

  return {
    short_description: `A clean, simple illustration visualizing the concept: "${concept.visual_metaphor}". This represents "${concept.name}" - a key concept from a research paper. Style: Modern, minimalist digital illustration. NO TEXT, NO LABELS, NO WORDS anywhere in the image. The image should be immediately understandable as a visual metaphor. Clean, iconic representation.`,

    background_setting: `Clean, simple gradient or solid color background in soft ${knowledgeLevel === 'beginner' ? 'warm pastel tones' : knowledgeLevel === 'intermediate' ? 'cool professional tones' : 'neutral academic tones'}. Minimal, uncluttered, complements the main visual element.`,

    objects: [
      {
        description: `Visual representation of: ${concept.visual_metaphor}. This metaphor represents the concept "${concept.name}". Create a clear, iconic illustration that captures this idea visually.`,
        location: 'centered in frame, slightly above center',
        relationship: 'Main focal point of the image',
        relative_size: 'large, occupying 60-70% of the frame',
        shape_and_color: `Clean illustration style with ${colorScheme.primary} as dominant color and ${colorScheme.accent} as accent. Bold, vibrant colors.`,
        texture:
          'flat vector illustration style, clean edges, no gradients on main object',
        appearance_details: `Simple, iconic representation with clean lines. NO TEXT OR LABELS. ${levelStyle[knowledgeLevel]} aesthetic. High contrast, visually striking.`,
        orientation: 'facing viewer, balanced composition',
      },
    ],

    text_render: [], // CRITICAL: Empty array - no text!

    lighting: {
      conditions: 'soft, even studio lighting',
      direction: 'diffused from above and front',
      shadows: 'minimal, soft shadows for depth only',
    },

    aesthetics: {
      composition: 'centered, balanced, simple, plenty of negative space',
      color_scheme: `${colorScheme.primary} dominant with ${colorScheme.secondary} accents on ${colorScheme.background} background`,
      mood_atmosphere: `clear, educational, ${levelStyle[knowledgeLevel]}`,
      preference_score: 'very high',
      aesthetic_score: 'very high',
    },

    photographic_characteristics: {
      depth_of_field: 'deep, everything in sharp focus',
      focus: 'sharp throughout entire image',
      camera_angle: 'straight-on, eye-level',
      lens_focal_length: 'standard lens',
    },

    style_medium: 'clean digital illustration, vector art style, flat design',
    context: `Educational visualization for ${knowledgeLevel} audience. This is one of several images explaining a research paper concept.`,
    artistic_style: `modern minimalist illustration, ${levelStyle[knowledgeLevel]}, clean lines, bold colors, NO TEXT, icon-style, infographic element`,
  };
}
