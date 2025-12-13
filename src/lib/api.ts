import { functions } from './appwrite';
import { GenerateRequest, GenerationStatus, InfographicResult } from './types';

// In a real scenario, we would use the function IDs from environment variables
const GENERATE_FUNCTION_ID = import.meta.env.VITE_APPWRITE_FUNCTION_GENERATE_ID || 'generate';

// Mock data for development when backend is not reachable
const MOCK_DELAY = 2000; // 2 seconds delay to simulate network

const mockStatusMap = new Map<string, GenerationStatus>();

export const api = {
  /**
   * Initiates the generation process.
   * Calls the Appwrite Function 'generate'.
   */
  generate: async (request: GenerateRequest): Promise<GenerationStatus> => {
    try {
      if (import.meta.env.VITE_USE_MOCKS === 'true') {
        return mockGenerate(request);
      }

      const response = await functions.createExecution(
        GENERATE_FUNCTION_ID,
        JSON.stringify(request),
        false, // async
        '/', // path
        'POST' // method
      );

      // The function should return the initial status and request ID
      if (response.status === 'completed') { // Execution status, not the logic status
         return JSON.parse(response.responseBody);
      } else {
         throw new Error('Function execution failed');
      }

    } catch (error) {
      console.error('API Error:', error);
      // Fallback to mock if configured or if call fails in dev
      if (import.meta.env.DEV) {
          console.warn('Falling back to mock implementation due to error.');
          return mockGenerate(request);
      }
      throw error;
    }
  },

  /**
   * Checks the status of a request.
   * In a real app, this might query the Appwrite Database or call a status function.
   * Here we simulate calling a status endpoint or DB lookup.
   */
  getStatus: async (requestId: string): Promise<GenerationStatus> => {
    try {
      if (import.meta.env.VITE_USE_MOCKS === 'true') {
        return mockGetStatus(requestId);
      }

      // Option A: Call a status function
      // const response = await functions.createExecution(STATUS_FUNCTION_ID, JSON.stringify({ request_id: requestId }), false, '/', 'GET');
      // return JSON.parse(response.responseBody);

      // Option B: Query Database directly (if client has read access)
      // For now, assuming we use a function or similar mechanism as per spec
      // The spec mentions GET /api/status/{request_id} which implies a function or route

      // Let's implement it as a function call for consistency with spec
      const response = await functions.createExecution(
        GENERATE_FUNCTION_ID, // Using same function with different method/path if supported, or separate function
        JSON.stringify({}),
        false,
        `/status/${requestId}`,
        'GET'
      );

      if (response.status === 'completed') {
          return JSON.parse(response.responseBody);
      } else {
          throw new Error('Function execution failed');
      }

    } catch (error) {
       console.error('API Error:', error);
       if (import.meta.env.DEV) {
         return mockGetStatus(requestId);
       }
       throw error;
    }
  }
};

// --- Mock Implementations ---

function mockGenerate(request: GenerateRequest): Promise<GenerationStatus> {
  const requestId = Math.random().toString(36).substring(7);
  const initialStatus: GenerationStatus = {
    request_id: requestId,
    status: 'pending',
    message: 'Your visual explainer is being generated'
  };

  mockStatusMap.set(requestId, initialStatus);

  // Simulate background processing
  simulateProcessing(requestId, request);

  return Promise.resolve(initialStatus);
}

function mockGetStatus(requestId: string): Promise<GenerationStatus> {
  const status = mockStatusMap.get(requestId);
  if (!status) {
    return Promise.reject(new Error('Request not found'));
  }
  return Promise.resolve(status);
}

async function simulateProcessing(requestId: string, request: GenerateRequest) {
  const steps = [
    { status: 'finding_paper', message: 'Finding relevant papers...' },
    { status: 'summarizing', message: 'Reading and summarizing...' },
    { status: 'generating_image', message: 'Generating your infographic...' },
    { status: 'complete', message: 'Complete!' }
  ];

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const current = mockStatusMap.get(requestId);
    if (!current) break;

    mockStatusMap.set(requestId, {
      ...current,
      status: step.status as any,
      message: step.message,
      result: step.status === 'complete' ? getMockResult(request) : undefined
    });
  }
}

function getMockResult(request: GenerateRequest): InfographicResult {
  return {
    paper_title: "Attention Is All You Need",
    paper_url: "https://arxiv.org/abs/1706.03762",
    image_url: "https://placehold.co/1024x1024/png?text=Transformer+Architecture", // Placeholder
    summary: {
      title: "Attention Is All You Need",
      one_liner: "A new way to help computers understand language by focusing on what matters most",
      key_concepts: [
        {
          name: "Self-Attention",
          explanation: "Instead of reading word by word, the model looks at all words at once.",
          visual_metaphor: "A spotlight that can shine on multiple actors on stage simultaneously"
        },
        {
          name: "Transformer Architecture",
          explanation: "The overall design that stacks attention layers to build understanding",
          visual_metaphor: "A tower where each floor refines the understanding from below"
        },
        {
            name: "Parallelization",
            explanation: "Processing everything at once instead of one step at a time",
            visual_metaphor: "A team of workers all building different parts simultaneously"
        }
      ],
      key_finding: "Transformers outperform previous models while being faster to train",
      real_world_impact: "This architecture powers ChatGPT, Google Search, and most modern AI"
    }
  };
}
