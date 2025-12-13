import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

// We mock the 'functions' export from '../appwrite'
vi.mock('../appwrite', () => ({
  functions: {
    createExecution: vi.fn(),
  },
}));

import { functions } from '../appwrite';

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to NOT using mocks (testing the real implementation logic with mocked appwrite client)
    vi.stubEnv('VITE_USE_MOCKS', 'false');
    vi.stubEnv('DEV', 'false'); // Simulate production-like behavior where we don't fallback automatically unless coded to
  });

  it('generate calls appwrite function and returns status', async () => {
    const mockResponse = {
      status: 'completed',
      responseBody: JSON.stringify({
        request_id: 'test-req-id',
        status: 'pending',
        message: 'Started',
      }),
    };

    (functions.createExecution as any).mockResolvedValue(mockResponse);

    const result = await api.generate({
      query: 'test query',
      knowledge_level: 'beginner',
    });

    expect(functions.createExecution).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('test query'),
      false,
      '/',
      'POST'
    );
    expect(result.request_id).toBe('test-req-id');
    expect(result.status).toBe('pending');
  });

  it('getStatus calls appwrite function and returns status', async () => {
    const mockResponse = {
      status: 'completed',
      responseBody: JSON.stringify({
        request_id: 'test-req-id',
        status: 'complete',
        result: { some: 'data' },
      }),
    };

    (functions.createExecution as any).mockResolvedValue(mockResponse);

    const result = await api.getStatus('test-req-id');

    expect(functions.createExecution).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({}),
        false,
        '/status/test-req-id',
        'GET'
    );
    expect(result.status).toBe('complete');
  });

  it('falls back to mock in DEV environment on error', async () => {
     vi.stubEnv('DEV', 'true');
     (functions.createExecution as any).mockRejectedValue(new Error('Network Error'));

     const result = await api.generate({ query: 'fail', knowledge_level: 'beginner' });

     expect(result.status).toBe('pending');
     expect(result.request_id).toBeDefined();
  });
});
