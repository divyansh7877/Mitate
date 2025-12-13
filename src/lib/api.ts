import { functions } from './appwrite'
import type { GenerateRequest, GenerationStatus, InfographicResult } from './types'

// Function IDs from environment variables
const GENERATE_FUNCTION_ID =
  import.meta.env.VITE_APPWRITE_FUNCTION_GENERATE_ID || 'generate'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
const ALLOW_MOCK_FALLBACK = import.meta.env.VITE_ALLOW_MOCK_FALLBACK === 'true'
const LOCAL_API_BASE_URL = import.meta.env.VITE_LOCAL_API_BASE_URL as string | undefined

// Mock data for development when backend is not reachable
const MOCK_DELAY = 2000 // 2 seconds delay to simulate network
const mockStatusMap = new Map<string, GenerationStatus>()

export const api = {
  /**
   * Initiates the generation process.
   * Calls the Appwrite Function via POST /
   */
  generate: async (request: GenerateRequest): Promise<GenerationStatus> => {
    if (USE_MOCKS) {
      console.log('[API] Using mock generation')
      return mockGenerate(request)
    }

    // Local dev API (no Appwrite / no DB)
    if (LOCAL_API_BASE_URL) {
      const resp = await fetch(`${LOCAL_API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      const text = await resp.text()
      if (!resp.ok) {
        throw new Error(`Local API error (${resp.status}): ${text}`)
      }
      return JSON.parse(text)
    }

    try {
      console.log(
        `[API] Calling generate function: ${GENERATE_FUNCTION_ID}`,
        request,
      )

      const response = await functions.createExecution(
        GENERATE_FUNCTION_ID,
        JSON.stringify(request),
        false, // not async (we want the immediate response)
        '/', // path
        'POST', // method
      )

      console.log('[API] Generate function response:', response)

      const statusCode = (response as any).responseStatusCode ?? (response as any).statusCode

      if (typeof statusCode === 'number' && statusCode >= 200 && statusCode < 300) {
        const result = JSON.parse(response.responseBody || '{}')
        console.log('[API] Generate result:', result)

        // Basic shape validation so we don't silently treat boilerplate JSON as success
        if (!result?.request_id || !result?.status) {
          throw new Error(
            `Generate function returned unexpected JSON (missing request_id/status). Body: ${response.responseBody}`,
          )
        }

        return result
      } else {
        throw new Error(
          `Function returned status ${statusCode}: ${
            (response as any).errors || (response as any).stderr || response.responseBody
          }`,
        )
      }
    } catch (error) {
      console.error('[API] Error calling generate function:', error)

      // Optional fallback to mock (explicit opt-in)
      if (import.meta.env.DEV && ALLOW_MOCK_FALLBACK) {
        console.warn('[API] Falling back to mock implementation due to error')
        return mockGenerate(request)
      }

      throw error
    }
  },

  /**
   * Checks the status of a generation request.
   * Calls the Appwrite Function via GET /?requestId=xxx
   */
  getStatus: async (requestId: string): Promise<GenerationStatus> => {
    if (USE_MOCKS) {
      return mockGetStatus(requestId)
    }

    // Local dev API (no Appwrite / no DB)
    if (LOCAL_API_BASE_URL) {
      const resp = await fetch(
        `${LOCAL_API_BASE_URL}/api/status?requestId=${encodeURIComponent(requestId)}`,
        { method: 'GET' },
      )
      const text = await resp.text()
      if (!resp.ok) {
        throw new Error(`Local API error (${resp.status}): ${text}`)
      }
      return JSON.parse(text)
    }

    try {
      console.log(`[API] Checking status for request: ${requestId}`)

      const response = await functions.createExecution(
        GENERATE_FUNCTION_ID,
        '', // empty body for GET
        false,
        `/?requestId=${requestId}`, // query parameter
        'GET',
      )

      console.log('[API] Status response:', response)

      const statusCode = (response as any).responseStatusCode ?? (response as any).statusCode

      if (typeof statusCode === 'number' && statusCode >= 200 && statusCode < 300) {
        const result = JSON.parse(response.responseBody || '{}')
        console.log('[API] Status result:', result)

        if (!result?.request_id || !result?.status) {
          throw new Error(
            `Status function returned unexpected JSON (missing request_id/status). Body: ${response.responseBody}`,
          )
        }

        return result
      } else if (statusCode === 404) {
        throw new Error('Request not found')
      } else {
        throw new Error(
          `Function returned status ${statusCode}: ${
            (response as any).errors || (response as any).stderr || response.responseBody
          }`,
        )
      }
    } catch (error) {
      console.error('[API] Error checking status:', error)

      // Optional fallback to mock (explicit opt-in)
      if (import.meta.env.DEV && ALLOW_MOCK_FALLBACK) {
        return mockGetStatus(requestId)
      }

      throw error
    }
  },
}

// ============================================================
// Mock Implementations (for development)
// ============================================================

function mockGenerate(request: GenerateRequest): Promise<GenerationStatus> {
  const requestId = `mock_${Math.random().toString(36).substring(7)}`
  const initialStatus: GenerationStatus = {
    request_id: requestId,
    status: 'pending',
    message: 'Your visual explainer is being generated',
  }

  mockStatusMap.set(requestId, initialStatus)

  // Simulate background processing
  simulateProcessing(requestId, request)

  return Promise.resolve(initialStatus)
}

function mockGetStatus(requestId: string): Promise<GenerationStatus> {
  const status = mockStatusMap.get(requestId)
  if (!status) {
    return Promise.reject(new Error('Request not found'))
  }
  return Promise.resolve(status)
}

async function simulateProcessing(requestId: string, request: GenerateRequest) {
  const steps = [
    { status: 'finding_paper', message: 'Finding relevant papers...' },
    { status: 'summarizing', message: 'Reading and summarizing...' },
    { status: 'generating_image', message: 'Generating your infographic...' },
    { status: 'complete', message: 'Complete!' },
  ]

  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY))
    const current = mockStatusMap.get(requestId)
    if (!current) break

    mockStatusMap.set(requestId, {
      ...current,
      status: step.status as any,
      message: step.message,
      result: step.status === 'complete' ? getMockResult(request) : undefined,
    })
  }
}

function getMockResult(request: GenerateRequest): InfographicResult {
  return {
    paper_title: 'Attention Is All You Need',
    paper_url: 'https://arxiv.org/abs/1706.03762',
    image_url: '/placehold.png',
    summary: {
      title: 'Attention Is All You Need',
      one_liner:
        'A new way to help computers understand language by focusing on what matters most',
      key_concepts: [
        {
          name: 'Self-Attention',
          explanation:
            'Instead of reading word by word, the model looks at all words at once.',
          visual_metaphor:
            'A spotlight that can shine on multiple actors on stage simultaneously',
        },
        {
          name: 'Transformer Architecture',
          explanation:
            'The overall design that stacks attention layers to build understanding',
          visual_metaphor:
            'A tower where each floor refines the understanding from below',
        },
        {
          name: 'Parallelization',
          explanation:
            'Processing everything at once instead of one step at a time',
          visual_metaphor:
            'A team of workers all building different parts simultaneously',
        },
      ],
      key_finding:
        'Transformers outperform previous models while being faster to train',
      real_world_impact:
        'This architecture powers ChatGPT, Google Search, and most modern AI',
    },
  }
}
